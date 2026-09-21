from __future__ import annotations
import re
import os
import sys
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import quote, unquote
try:
    import httpx
except ImportError:
    httpx = None
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("WikidataPhotoSync")

WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
WIKIDATA_FALLBACK_ENDPOINT = "https://query-main.wikidata.org/sparql"
COMMONS_API_ENDPOINT = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "ApnaNeta/1.0 (https://apnaneta.in; civic-tech electoral integrity; open-data audit)"


HONORIFICS = {
    "dr", "prof", "shri", "smt", "adv", "advocate", "ku", "km", "kumari",
    "mr", "mrs", "ms", "chaudhary", "ch", "sardar", "thakur", "pandit",
    "late", "alhaj", "begum", "syed", "capt", "captain", "colonel", "col",
    "justice", "swami", "sant", "yogi"
}


def clean_name_tokens(name: str) -> List[str]:
    """Strips parenthetical notes, honorifics, and returns lowercase clean tokens."""
    name = re.sub(r"\(.*?\)", "", name)
    cleaned = "".join(c.lower() if (c.isalnum() or c.isspace()) else " " for c in name)
    tokens = [t for t in cleaned.split() if t not in HONORIFICS and len(t) > 0]
    return tokens


def normalize_name(name: str) -> str:
    """Normalizes candidate names for fuzzy index matching."""
    cleaned = "".join(c.lower() for c in name if c.isalnum() or c.isspace())
    return " ".join(cleaned.split())


def name_tokens_key(name: str) -> str:
    """Returns sorted tokens of the name to match inverted or honorific name formats."""
    tokens = sorted(normalize_name(name).split())
    return " ".join(tokens)


def strip_html_tags(text: str) -> str:
    """Strips HTML tags from metadata fields (like Artist in Wikimedia)."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    return " ".join(clean.split()).strip()


class WikidataPhotoSynchronizer:
    """
    Synchronizes high-resolution portrait photos and verified Creative Commons
    legal attribution metadata for Indian Parliamentarians from Wikidata & Wikimedia Commons.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=0.5, max_delay=1.2)
        self.first_last_index: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}

    async def fetch_existing_candidates(self) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        """Loads candidates from Supabase into normalized lookup indices."""
        logger.info("Loading candidates index from Supabase for photo matching...")
        exact_index: Dict[str, Dict[str, Any]] = {}
        token_index: Dict[str, Dict[str, Any]] = {}
        first_last_index: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
        offset = 0
        batch_size = 1000

        while True:
            try:
                records = await supabase.select(
                    "candidates",
                    {
                        "select": "id,name,state,constituency,party,photo_url,photo_source",
                        "limit": str(batch_size),
                        "offset": str(offset),
                    },
                )
                if not records:
                    break

                for row in records:
                    raw_name = row.get("name", "")
                    norm = normalize_name(raw_name)
                    t_key = name_tokens_key(raw_name)
                    c_toks = clean_name_tokens(raw_name)
                    row["_clean_tokens"] = c_toks

                    if norm:
                        exact_index[norm] = row
                    if t_key:
                        token_index[t_key] = row
                    if c_toks:
                        c_key = " ".join(sorted(c_toks))
                        token_index[c_key] = row
                        if len(c_toks) >= 2:
                            fl_pair = (c_toks[0], c_toks[-1])
                            first_last_index.setdefault(fl_pair, []).append(row)

                offset += len(records)
                if len(records) < batch_size:
                    break
            except Exception as e:
                logger.warning(f"Error paginating candidates at offset {offset}: {e}")
                break

        self.first_last_index = first_last_index
        logger.info(f"Indexed {len(exact_index)} candidates for photo resolution.")
        return exact_index, token_index

    def match_candidate(
        self,
        wiki_name: str,
        exact_index: Dict[str, Dict[str, Any]],
        token_index: Dict[str, Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Matches a Wikidata politician name against candidate indices with fuzzy Indian name handling."""
        norm = normalize_name(wiki_name)
        if norm in exact_index:
            return exact_index[norm]

        t_key = name_tokens_key(wiki_name)
        if t_key in token_index:
            return token_index[t_key]

        w_toks = clean_name_tokens(wiki_name)
        if not w_toks:
            return None

        c_key = " ".join(sorted(w_toks))
        if c_key in token_index:
            return token_index[c_key]

        if len(w_toks) >= 2 and hasattr(self, "first_last_index"):
            fl_pair = (w_toks[0], w_toks[-1])
            candidates = self.first_last_index.get(fl_pair, [])
            if len(candidates) == 1:
                return candidates[0]
            elif len(candidates) > 1:
                w_set = set(w_toks)
                for cand in candidates:
                    cand_set = set(cand.get("_clean_tokens", []))
                    if w_set.issubset(cand_set):
                        return cand
                return candidates[0]

        return None

    async def _execute_sparql(self, client: httpx.AsyncClient, query: str) -> List[Dict[str, Any]]:
        """Executes a SPARQL query via POST with exponential backoff and multi-endpoint failover."""
        endpoints = [
            WIKIDATA_SPARQL_ENDPOINT,
            WIKIDATA_FALLBACK_ENDPOINT,
        ]
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/sparql-results+json",
        }

        for attempt in range(1, 4):
            for endpoint in endpoints:
                try:
                    resp = await client.post(
                        endpoint,
                        data={"query": query, "format": "json"},
                        headers=headers,
                        timeout=40.0,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data.get("results", {}).get("bindings", [])
                    elif resp.status_code in (500, 502, 503, 504, 429):
                        logger.warning(
                            f"SPARQL attempt {attempt} on {endpoint} returned HTTP {resp.status_code}. Retrying..."
                        )
                except Exception as e:
                    logger.warning(f"SPARQL attempt {attempt} on {endpoint} failed: {e}")

            if attempt < 3:
                await asyncio.sleep(2 ** attempt)

        return []

    async def fetch_wikidata_mp_photos(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Executes targeted SPARQL queries for Lok Sabha & Rajya Sabha MPs with photos.
        Splits queries to eliminate expensive UNIONs that trigger 502 Bad Gateway timeouts.
        """
        lok_sabha_query = """
        SELECT ?politician ?politicianLabel ?image WHERE {
          VALUES ?pos {
            wd:Q16556694   # Member of the Lok Sabha
            wd:Q125498038  # Member of the 18th Lok Sabha (current)
            wd:Q56051771   # Member of the 17th Lok Sabha
            wd:Q42509248   # Member of the 16th Lok Sabha
            wd:Q15686919   # Member of the 15th Lok Sabha
            wd:Q15686915   # Member of the 14th Lok Sabha
            wd:Q63098715   # Leader of the Opposition in Lok Sabha (e.g. Rahul Gandhi)
            wd:Q1058223    # Member of Parliament, Lok Sabha
            wd:Q1055743    # Member of Parliament in India
            wd:Q14212      # Prime Minister of India
          }
          ?politician wdt:P39 ?pos;
                      wdt:P18 ?image.
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        """

        rajya_sabha_query = """
        SELECT ?politician ?politicianLabel ?image WHERE {
          VALUES ?pos {
            wd:Q17324844   # Member of the Rajya Sabha
            wd:Q1058225    # Member of Parliament, Rajya Sabha
            wd:Q63098716   # Leader of the Opposition in Rajya Sabha
            wd:Q3347071    # Leader of the House in Rajya Sabha
          }
          ?politician wdt:P39 ?pos;
                      wdt:P18 ?image.
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        """

        logger.info("Querying Wikidata SPARQL for parliamentarians with portrait photos...")
        if httpx is None:
            logger.warning("httpx is not installed.")
            return []

        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            ls_bindings = await self._execute_sparql(client, lok_sabha_query)
            if not ls_bindings:
                # Fallback to direct rdfs:label if label service times out
                logger.info("Retrying Lok Sabha query with direct rdfs:label...")
                ls_alt = """
                SELECT ?politician ?politicianLabel ?image WHERE {
                  VALUES ?pos {
                    wd:Q16556694
                    wd:Q125498038
                    wd:Q56051771
                    wd:Q42509248
                    wd:Q15686919
                    wd:Q15686915
                    wd:Q63098715
                    wd:Q1058223
                    wd:Q1055743
                    wd:Q14212
                  }
                  ?politician wdt:P39 ?pos;
                              wdt:P18 ?image;
                              rdfs:label ?politicianLabel.
                  FILTER(LANG(?politicianLabel) = "en")
                }
                """
                ls_bindings = await self._execute_sparql(client, ls_alt)

            rs_bindings = await self._execute_sparql(client, rajya_sabha_query)
            if not rs_bindings:
                logger.info("Retrying Rajya Sabha query with direct rdfs:label...")
                rs_alt = """
                SELECT ?politician ?politicianLabel ?image WHERE {
                  VALUES ?pos {
                    wd:Q17324844
                    wd:Q1058225
                    wd:Q63098716
                    wd:Q3347071
                  }
                  ?politician wdt:P39 ?pos;
                              wdt:P18 ?image;
                              rdfs:label ?politicianLabel.
                  FILTER(LANG(?politicianLabel) = "en")
                }
                """
                rs_bindings = await self._execute_sparql(client, rs_alt)

        all_bindings = ls_bindings + rs_bindings
        logger.info(f"Retrieved {len(all_bindings)} total records ({len(ls_bindings)} Lok Sabha, {len(rs_bindings)} Rajya Sabha).")

        parsed = []
        seen_entities = set()
        for item in all_bindings:
            ent_uri = item.get("politician", {}).get("value", "")
            if ent_uri and ent_uri in seen_entities:
                continue
            if ent_uri:
                seen_entities.add(ent_uri)

            name = item.get("politicianLabel", {}).get("value", "").strip()
            image_url = item.get("image", {}).get("value", "").strip()
            if name and image_url and not name.startswith("Q"):  # filter out unresolved QIDs
                parsed.append({"name": name, "image_url": image_url})

        logger.info(f"Parsed {len(parsed)} unique parliamentarians with portraits.")
        return parsed

    async def fetch_wikimedia_file_metadata(self, client: httpx.AsyncClient, file_name: str) -> Dict[str, Any]:
        """
        Fetches license, author, and 300px thumbnail URL for a Wikimedia Commons file
        using the official MediaWiki Action API for full TASL compliance.
        """
        params = {
            "action": "query",
            "titles": f"File:{file_name}",
            "prop": "imageinfo",
            "iiprop": "extmetadata|url",
            "iiurlwidth": "300",
            "format": "json",
        }
        headers = {"User-Agent": USER_AGENT}

        try:
            resp = await client.get(COMMONS_API_ENDPOINT, params=params, headers=headers)
            if resp.status_code != 200:
                return {}
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            for _, page_val in pages.items():
                imageinfo = page_val.get("imageinfo", [])
                if imageinfo:
                    info = imageinfo[0]
                    ext = info.get("extmetadata", {})
                    artist = strip_html_tags(ext.get("Artist", {}).get("value", "")) or "Unknown"
                    license_name = ext.get("LicenseShortName", {}).get("value", "Creative Commons")
                    license_url = ext.get("LicenseUrl", {}).get("value", "https://creativecommons.org")
                    thumb_url = info.get("thumburl") or info.get("url")
                    desc_url = info.get("descriptionurl")

                    attribution = f"Photo by {artist} • {license_name} via Wikimedia Commons"
                    return {
                        "thumb_url": thumb_url,
                        "attribution": attribution,
                        "license_url": license_url,
                        "description_url": desc_url,
                    }
        except Exception as e:
            logger.debug(f"Failed to fetch metadata for {file_name}: {e}")

        return {}

    async def sync_photos(self, limit: Optional[int] = None) -> int:
        """Main synchronizer loop: queries Wikidata, resolves metadata, and updates Supabase."""
        exact_index, token_index = await self.fetch_existing_candidates()
        if not exact_index:
            logger.warning("No candidates found in Supabase database to match against.")
            return 0

        wiki_items = await self.fetch_wikidata_mp_photos()
        if not wiki_items:
            logger.info("No Wikidata items returned.")
            return 0

        updated_count = 0
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            for item in wiki_items:
                if limit and updated_count >= limit:
                    logger.info(f"Target update limit of {limit} reached. Stopping sync.")
                    break

                raw_name = item["name"]
                raw_image_url = item["image_url"]

                matched_cand = self.match_candidate(raw_name, exact_index, token_index)
                if not matched_cand:
                    continue

                candidate_id = matched_cand.get("id")
                # Don't re-update if already has a wikimedia photo
                if matched_cand.get("photo_source") == "wikimedia" and matched_cand.get("photo_url"):
                    continue

                # Extract File: name from URL
                file_name = unquote(raw_image_url.split("/")[-1])
                meta = await self.fetch_wikimedia_file_metadata(client, file_name)

                fallback_url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(file_name)}?width=300"
                photo_url = meta.get("thumb_url") or fallback_url
                if photo_url.startswith("http://"):
                    photo_url = "https://" + photo_url[7:]
                attribution = meta.get("attribution") or "Photo via Wikimedia Commons (CC BY-SA)"
                license_url = meta.get("license_url") or "https://creativecommons.org"

                try:
                    await supabase.update(
                        "candidates",
                        {
                            "photo_url": photo_url,
                            "photo_source": "wikimedia",
                            "photo_attribution": attribution,
                            "photo_license_url": license_url,
                        },
                        {"id": f"eq.{candidate_id}"},
                    )
                    updated_count += 1
                    logger.info(f"✅ Synced Wikimedia photo for {raw_name} -> {photo_url}")
                except Exception as e:
                    logger.warning(f"Failed to update candidate photo for {raw_name}: {e}")

                await self.rate_limiter.wait()

        logger.info(f"🎉 Photo sync complete! Updated {updated_count} candidate profiles with Creative Commons photos.")
        return updated_count


synchronizer = WikidataPhotoSynchronizer()

if __name__ == "__main__":
    raw_limit = (os.getenv("LIMIT") or (sys.argv[1] if len(sys.argv) > 1 else "all")).strip().lower()
    if raw_limit in ("all", "0", "none", "", "unlimited"):
        limit_val = None
        logger.info("Running photo sync with limit=ALL (querying all available parliamentarians with photos)")
    else:
        try:
            limit_val = int(raw_limit)
            logger.info(f"Running photo sync with limit={limit_val}")
        except ValueError:
            limit_val = None
            logger.info("Running photo sync with limit=ALL (fallback)")

    asyncio.run(synchronizer.sync_photos(limit=limit_val))
