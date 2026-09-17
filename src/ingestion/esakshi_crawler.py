import os
import sys
import logging
import asyncio
from typing import List, Dict, Any, Optional
try:
    import httpx
except ImportError:
    httpx = None
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eSAKSHICrawler")

ESAKSHI_BASE = "https://mplads.mospi.gov.in"
ESAKSHI_DISTRICTS_API = f"{ESAKSHI_BASE}/api/public/districts"
ESAKSHI_WORKS_API = f"{ESAKSHI_BASE}/api/public/works"


class ESAKSHISessionCrawler:
    """
    Session-based Multi-District Crawler for the Ministry of Statistics and
    Programme Implementation (MoSPI) e-SAKSHI MPLADS Portal.
    Traverses Single Nodal Agency (SNA) state accounts down to parliamentary
    constituencies and districts to extract granular sanctioned development works,
    statutory SC/ST sub-allocations, and GPS coordinates for GIS auditing.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=1.0, max_delay=2.5)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
        }

    async def fetch_district_works(
        self,
        state_name: str,
        district_name: str,
        mp_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Polls e-SAKSHI granular works API for a given district and MP.
        """
        await self.rate_limiter.wait()
        url = f"{ESAKSHI_WORKS_API}?state={state_name}&district={district_name}"
        if mp_name:
            url += f"&mp={mp_name}"

        logger.info(f"Querying e-SAKSHI granular works: {url}")
        try:
            async with httpx.AsyncClient(timeout=30.0, headers=self.headers) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    works = data if isinstance(data, list) else data.get("works", [])
                    logger.info(f"Discovered {len(works)} work sanctions for {district_name}, {state_name}.")
                    return works
                logger.warning(f"e-SAKSHI returned status {resp.status_code}")
                return []
        except Exception as e:
            logger.debug(f"e-SAKSHI live query encountered error: {e}")
            return []

    def parse_work_record(self, raw_work: Dict[str, Any], candidate_id: str) -> Dict[str, Any]:
        """
        Standardizes raw e-SAKSHI work records into the database schema format.
        """
        work_id = str(raw_work.get("work_id") or raw_work.get("id") or "").strip()
        title = raw_work.get("work_title") or raw_work.get("description") or "Community Development Work"
        sector = raw_work.get("sector") or raw_work.get("category") or "Infrastructure"
        sanctioned = float(raw_work.get("sanctioned_amount", 0.0))
        expenditure = float(raw_work.get("expenditure_amount", 0.0))
        status = raw_work.get("status", "Sanctioned")

        # GPS Geolocation coordinates
        lat = raw_work.get("latitude") or raw_work.get("lat")
        lon = raw_work.get("longitude") or raw_work.get("lng") or raw_work.get("lon")

        latitude = float(lat) if lat is not None else None
        longitude = float(lon) if lon is not None else None

        sc_st = raw_work.get("sc_st_category") or raw_work.get("suballocation") or "General"
        comp_date = raw_work.get("completion_date")

        return {
            "candidate_id": candidate_id,
            "work_id": work_id,
            "work_title": title,
            "sector": sector,
            "sanctioned_amount": sanctioned,
            "expenditure_amount": expenditure,
            "status": status,
            "latitude": latitude,
            "longitude": longitude,
            "sc_st_category": sc_st,
            "completion_date": comp_date,
            "gis_verified": False,
        }

    async def sync_works_for_candidate(
        self,
        candidate_id: str,
        state_name: str,
        district_or_constituency: str,
        mp_name: Optional[str] = None,
    ) -> int:
        """
        Fetches granular works from e-SAKSHI and upserts them into mplads_works in Supabase.
        """
        raw_works = await self.fetch_district_works(state_name, district_or_constituency, mp_name)
        if not raw_works:
            return 0

        parsed_records = []
        for rw in raw_works:
            record = self.parse_work_record(rw, candidate_id)
            if record.get("work_id"):
                parsed_records.append(record)

        if not parsed_records:
            return 0

        try:
            await supabase.upsert("mplads_works", parsed_records, on_conflict="work_id")
            logger.info(f"✅ Upserted {len(parsed_records)} e-SAKSHI work sanctions for candidate {candidate_id}")
            return len(parsed_records)
        except Exception as e:
            logger.error(f"Error upserting mplads_works: {e}")
            return 0


esakshi_crawler = ESAKSHISessionCrawler()
