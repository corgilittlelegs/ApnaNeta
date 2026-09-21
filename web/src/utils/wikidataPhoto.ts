import { useState, useEffect } from 'react';

export interface ResolvedWikidataPhoto {
  photoUrl: string;
  attribution: string;
  licenseUrl: string;
}

const HONORIFICS = new Set([
  'dr', 'doctor', 'prof', 'professor', 'shri', 'sh', 'smt', 'shrimati',
  'adv', 'advocate', 'ku', 'km', 'kumari', 'mr', 'mrs', 'ms',
  'chaudhary', 'ch', 'sardar', 'thakur', 'pandit', 'pt',
  'late', 'alhaj', 'al-haj', 'haji', 'begum', 'syed', 'capt', 'captain',
  'colonel', 'col', 'major', 'gen', 'general', 'justice', 'swami',
  'sant', 'yogi', 'mahant', 'acharya', 'kunwar', 'rao', 'babu', 'nawab',
  'retd', 'ips', 'ias', 'ifs', 'ex-mp', 'ex-mla', 'mla', 'mp'
]);

const HONORIFICS_REGEX =
  /\b(dr|doctor|prof|professor|shri|sh|smt|shrimati|adv|advocate|ku|km|kumari|mr|mrs|ms|chaudhary|ch|sardar|thakur|pandit|pt|late|alhaj|al-haj|haji|begum|syed|capt|captain|colonel|col|major|gen|general|justice|swami|sant|yogi|mahant|acharya|kunwar|rao|babu|nawab|retd|ips|ias|ifs|ex-mp|ex-mla|mla|mp)\b\.?/gi;

export function cleanNameTokens(name: string): string[] {
  const withoutParens = name.replace(/\(.*?\)/g, '');
  const cleaned = withoutParens.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return cleaned
    .split(/\s+/)
    .filter((t) => t.length > 0 && !HONORIFICS.has(t));
}

export function isStrictNameMatch(candName: string, entityLabel: string): boolean {
  const cToks = cleanNameTokens(candName);
  const eToks = cleanNameTokens(entityLabel);

  if (!cToks.length || !eToks.length) return false;

  // Single-token candidate must match exact single-token entity
  if (cToks.length === 1) {
    return eToks.length === 1 && cToks[0] === eToks[0];
  }

  const cSet = new Set(cToks);
  const eSet = new Set(eToks);

  // Surnames must match if both have 2+ tokens
  if (cToks.length >= 2 && eToks.length >= 2) {
    const cLast = cToks[cToks.length - 1];
    const eLast = eToks[eToks.length - 1];
    if (cLast !== eLast && !eSet.has(cLast) && !cSet.has(eLast)) {
      return false;
    }
  }

  let intersectionCount = 0;
  for (const t of cToks) {
    if (eSet.has(t)) intersectionCount++;
  }
  const overlap = intersectionCount / Math.max(cSet.size, eSet.size);
  const isSubset = cToks.every((t) => eSet.has(t)) || eToks.every((t) => cSet.has(t));
  return overlap >= 0.6 || isSubset;
}

const NON_POLITICAL_EXCLUSIONS = new Set([
  'actress', 'actor', 'singer', 'playback singer', 'musician', 'violinist',
  'mathematician', 'cricketer', 'footballer', 'film', 'director', 'poet',
  'writer', 'neurosurgeon', 'doctor', 'physician', 'river', 'building',
  'temple', 'monument', 'model', 'painter', 'sculptor', 'astronomer'
]);

const POLITICAL_TERMS = new Set([
  'politician', 'minister', 'parliament', 'assembly', 'mp', 'mla',
  'chief minister', 'political leader', 'governor', 'senator',
  'lok sabha', 'rajya sabha', 'prime minister', 'president', 'political activist'
]);

/**
 * Generates dynamic search queries covering Indian election name variations:
 * - Parentheticals: '(Dr.) Ram Shankar Katheria' -> 'Ram Shankar Katheria'
 * - Prefixes: 'Dr. Mahesh Sharma' -> 'Mahesh Sharma'
 * - Retained titles: 'Yogi Adityanath' -> 'Yogi Adityanath'
 * - Comma inverted: 'Katheria, Ram Shankar' -> 'Ram Shankar Katheria'
 * - Aliases: 'Prakash (alias Bablu) Sharma' -> 'Prakash Sharma', 'Bablu Sharma'
 * - Initials: 'A. M. Ariff' -> 'A M Ariff'
 */
export function generateCandidateSearchQueries(rawName: string): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();
  const rawTokens = cleanNameTokens(rawName);

  const add = (q: string) => {
    const clean = q.trim().replace(/^[\s,.\-/"'()]+|[\s,.\-/"'()]+$/g, '').replace(/\s+/g, ' ');
    const qTokens = cleanNameTokens(clean);
    // Prevent emitting single-word queries if the candidate name has 2+ tokens
    if (rawTokens.length >= 2 && qTokens.length < 2) {
      return;
    }
    if (clean.length >= 3 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      queries.push(clean);
    }
  };

  // 1. Comma inversion: 'Last, First Middle' -> 'First Middle Last'
  if (rawName.includes(',')) {
    const parts = rawName.split(',', 2);
    if (parts.length === 2) {
      add(`${parts[1].trim()} ${parts[0].trim()}`);
    }
  }

  // 2. Extract content inside parentheses
  const insideParens = [...rawName.matchAll(/\((.*?)\)/g)].map((m) => m[1]);

  // 3. Strip parenthetical content completely
  const withoutParens = rawName.replace(/\s*\(.*?\)/g, '');

  // 4. Strip honorifics from withoutParens
  const cleanNoHonorifics = withoutParens
    .replace(HONORIFICS_REGEX, '')
    .replace(/[\.,'"\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  add(cleanNoHonorifics);

  // 5. Clean withoutParens preserving potential public names like Yogi
  const cleanWithHonorifics = withoutParens
    .replace(/[\.,'"\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  add(cleanWithHonorifics);

  // 6. Check aliases inside parentheses
  for (const p of insideParens) {
    const pClean = p
      .replace(/\b(alias|aka|urff?)\b/gi, '')
      .replace(HONORIFICS_REGEX, '')
      .replace(/[\.,'"\-/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const baseTokens = cleanNoHonorifics.split(' ').filter(Boolean);
    if (baseTokens.length >= 2 && pClean) {
      add(`${pClean} ${baseTokens[baseTokens.length - 1]}`);
    }
    if (pClean) {
      add(pClean);
    }
  }

  // 7. Add raw cleaned name as fallback
  add(rawName.replace(/[()[\],'"\-/]/g, ' '));

  return queries;
}

const memoryCache = new Map<string, ResolvedWikidataPhoto | null>();

/**
 * Dynamically resolves a candidate's portrait photo and Creative Commons metadata
 * from Wikidata Entity Search and Wikimedia Commons APIs with client-side caching.
 */
export async function fetchWikidataPhoto(rawName: string): Promise<ResolvedWikidataPhoto | null> {
  const cacheKey = `apnaneta_photo_${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  try {
    const cachedSession = sessionStorage.getItem(cacheKey);
    if (cachedSession) {
      const parsed = JSON.parse(cachedSession) as ResolvedWikidataPhoto | null;
      memoryCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {
    // sessionStorage may not be available in private browsing or iframe
  }

  const queries = generateCandidateSearchQueries(rawName);

  for (const q of queries) {
    try {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
        q
      )}&language=en&type=item&format=json&origin=*&limit=5`;

      const searchResp = await fetch(searchUrl);
      if (!searchResp.ok) continue;

      const searchData = await searchResp.json();
      const results: Array<{ id: string; label?: string; description?: string }> = searchData.search || [];

      for (const r of results) {
        const label = r.label || '';
        // Guard 1: Strict name similarity check (rejects mismatched surnames like Harish Rawat vs Harish Chandra Singh)
        if (!isStrictNameMatch(rawName, label)) continue;

        const desc = (r.description || '').toLowerCase();

        // Guard 2: Reject non-political professions unless political terms are also present
        const hasPolTerm = Array.from(POLITICAL_TERMS).some((t) => desc.includes(t));
        const hasNonPolTerm = Array.from(NON_POLITICAL_EXCLUSIONS).some((t) => desc.includes(t));
        if (hasNonPolTerm && !hasPolTerm) continue;

        const entityId = r.id;
        const claimUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json&origin=*`;
        const claimResp = await fetch(claimUrl);
        if (!claimResp.ok) continue;

        const claimData = await claimResp.json();
        const claims = claimData.entities?.[entityId]?.claims || {};

        // Guard 3: Enforce P31: instance of human (Q5)
        const p31Claims = claims.P31 || [];
        const isHuman = p31Claims.some(
          (c: any) => c?.mainsnak?.datavalue?.value?.id === 'Q5'
        );
        if (!isHuman) continue;

        // Guard 4: Enforce political qualification: P39 (position held), P106 (politician Q82955, etc.), or political term in description
        const p106Claims = claims.P106 || [];
        const isPoliticianOcc = p106Claims.some((c: any) => {
          const id = c?.mainsnak?.datavalue?.value?.id;
          return ['Q82955', 'Q486839', 'Q14211', 'Q30461', 'Q193391', 'Q2285706'].includes(id);
        });
        const hasPoliticalOffice = Array.isArray(claims.P39) && claims.P39.length > 0;
        if (!isPoliticianOcc && !hasPoliticalOffice && !hasPolTerm) continue;

        const p18 = claims.P18;
        if (!p18 || !p18.length) continue;

        const rawImageFilename: string | undefined = p18[0]?.mainsnak?.datavalue?.value;
        if (!rawImageFilename) continue;

        // Fetch Commons thumbnail and attribution
        const metaUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(
          rawImageFilename
        )}&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=300&format=json&origin=*`;

        const metaResp = await fetch(metaUrl);
        if (!metaResp.ok) continue;

        const metaData = await metaResp.json();
        const pages = metaData.query?.pages || {};
        const pageKey = Object.keys(pages)[0];
        const imageInfo = pages[pageKey]?.imageinfo?.[0];

        if (!imageInfo) continue;

        const ext = imageInfo.extmetadata || {};
        const artist = (ext.Artist?.value || '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim() || 'Unknown';
        const licenseName = ext.LicenseShortName?.value || 'Creative Commons';
        const licenseUrl = ext.LicenseUrl?.value || 'https://creativecommons.org';
        let thumbUrl = imageInfo.thumburl || imageInfo.url;
        if (thumbUrl?.startsWith('http://')) {
          thumbUrl = 'https://' + thumbUrl.slice(7);
        }

        const resolved: ResolvedWikidataPhoto = {
          photoUrl: thumbUrl || `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(rawImageFilename)}?width=300`,
          attribution: `Photo by ${artist} • ${licenseName} via Wikimedia Commons`,
          licenseUrl,
        };

        memoryCache.set(cacheKey, resolved);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(resolved));
        } catch {
          // Ignore quota errors
        }

        return resolved;
      }
    } catch {
      // Continue to next query variation on network failure
      continue;
    }
  }

  // Cache null to prevent redundant queries
  memoryCache.set(cacheKey, null);
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(null));
  } catch {
    // Ignore quota errors
  }

  return null;
}

/**
 * React hook to supply candidate photo URL with dynamic fallback to Wikidata.
 */
export function useCandidatePhoto(candidateName: string, initialPhotoUrl?: string) {
  const [photo, setPhoto] = useState<{
    photoUrl?: string;
    attribution?: string;
    isDynamic: boolean;
  }>({
    photoUrl: initialPhotoUrl,
    isDynamic: false,
  });

  useEffect(() => {
    if (initialPhotoUrl) {
      setPhoto({ photoUrl: initialPhotoUrl, isDynamic: false });
      return;
    }

    let isMounted = true;
    fetchWikidataPhoto(candidateName).then((resolved) => {
      if (isMounted && resolved) {
        setPhoto({
          photoUrl: resolved.photoUrl,
          attribution: resolved.attribution,
          isDynamic: true,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [candidateName, initialPhotoUrl]);

  return photo;
}
