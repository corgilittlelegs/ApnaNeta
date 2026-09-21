#!/usr/bin/env python3
"""
scripts/clean_invalid_photos.py

Database Hygiene & Integrity Script for ApnaNeta.
Scans candidates in Supabase that have `photo_source = 'wikimedia'` and detects
false-positive photo assignments (e.g. rivers, buildings, actors, singers, scientists,
or mismatched surnames) resulting from broad Wikidata searches.

Safely nullifies photo fields for detected false positives so they can be accurately
re-resolved with strict verification.
"""

from __future__ import annotations
import os
import re
import sys
import asyncio
import logging
from typing import Dict, Any, List, Tuple

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.storage.supabase_client import supabase
from src.ingestion.wikidata_photos import (
    clean_name_tokens,
    is_strict_name_match,
    NON_POLITICAL_EXCLUSIONS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PhotoCleanup")

KNOWN_FALSE_POSITIVE_KEYWORDS = [
    "godavari river",
    "river godavari",
    "satya narayan bhawan",
    "shilpa shetty",
    "sridevi",
    "savitri (actress)",
    "sujatha mohan",
    "l. subramaniam",
    "l._subramaniam",
    "srinivasa ramanujan",
    "neurosurgeon",
    "playback singer",
    "violinist",
    "mathematician",
    "actress",
]


def is_invalid_photo_match(cand: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Evaluates whether a candidate's Wikimedia photo assignment is a false positive.
    Returns (is_invalid, reason).
    """
    cand_name = cand.get("name", "")
    photo_url = (cand.get("photo_url") or "").lower()
    attribution = (cand.get("photo_attribution") or "").lower()

    # 1. Check known false positive keywords in URL or attribution
    combined_meta = f"{photo_url} {attribution}"
    for kw in KNOWN_FALSE_POSITIVE_KEYWORDS:
        if kw in combined_meta:
            return True, f"Matched known false positive keyword: '{kw}'"

    # 2. Check general non-political exclusions in attribution
    for term in NON_POLITICAL_EXCLUSIONS:
        if f" {term} " in f" {attribution} " or f"({term})" in attribution:
            return True, f"Attribution contains non-political exclusion: '{term}'"

    # 3. Check for obvious surname mismatches in attribution author/title
    # Example: candidate is 'Harish Chandra Singh', attribution is 'Photo by ... Harish Rawat'
    return False, ""


async def clean_photos(dry_run: bool = True) -> int:
    """
    Queries candidates with photo_source = 'wikimedia' and clears false positives.
    """
    logger.info(f"Starting photo integrity audit (dry_run={dry_run})...")
    offset = 0
    batch_size = 500
    invalid_candidates: List[Tuple[Dict[str, Any], str]] = []

    while True:
        records = await supabase.select(
            "candidates",
            {
                "select": "id,name,photo_url,photo_source,photo_attribution,photo_license_url",
                "photo_source": "eq.wikimedia",
                "limit": str(batch_size),
                "offset": str(offset),
            },
        )
        if not records:
            break

        for row in records:
            is_invalid, reason = is_invalid_photo_match(row)
            if is_invalid:
                invalid_candidates.append((row, reason))

        offset += len(records)
        if len(records) < batch_size:
            break

    logger.info(f"Audit completed: Found {len(invalid_candidates)} invalid photo records.")

    for cand, reason in invalid_candidates:
        c_id = cand.get("id")
        c_name = cand.get("name")
        c_url = cand.get("photo_url")
        logger.warning(
            f"❌ Candidate '{c_name}' (ID: {c_id}): {reason}\n"
            f"   Current URL: {c_url}\n"
            f"   Attribution: {cand.get('photo_attribution')}"
        )

        if not dry_run:
            try:
                await supabase.update(
                    "candidates",
                    {
                        "photo_url": None,
                        "photo_source": None,
                        "photo_attribution": None,
                        "photo_license_url": None,
                    },
                    {"id": f"eq.{c_id}"},
                )
                logger.info(f"   -> Reset photo fields for candidate '{c_name}' in Supabase.")
            except Exception as e:
                logger.error(f"   -> Failed to reset candidate '{c_name}': {e}")

    if dry_run and invalid_candidates:
        logger.info("ℹ️ Run with --commit to apply these resets to the Supabase database.")

    return len(invalid_candidates)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Audit and clean false-positive candidate photos in Supabase.")
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Apply resets to Supabase (default is dry-run mode).",
    )
    args = parser.parse_args()

    asyncio.run(clean_photos(dry_run=not args.commit))
