import csv
import io
import logging
from typing import List, Dict, Any
import httpx
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# OpenSanctions India Parliamentarians Dataset (Public & Free)
OPEN_SANSAD_CSV_URL = "https://data.opensanctions.org/datasets/latest/in_sansad/targets.simple.csv"


async def ingest_open_sansad(limit: int = 0) -> int:
    """
    Streams and loads Indian parliamentarians (Lok Sabha & Rajya Sabha)
    directly from OpenSanctions into Supabase in memory without saving
    large files to disk.
    """
    logger.info(f"Streaming OpenSanctions data from: {OPEN_SANSAD_CSV_URL}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(OPEN_SANSAD_CSV_URL)
        response.raise_for_status()
        csv_content = response.text

    reader = csv.DictReader(io.StringIO(csv_content))
    candidates_batch: List[Dict[str, Any]] = []
    total_loaded = 0
    batch_size = 250

    for row in reader:
        # Schema filter: Only process Person entities
        if row.get("schema") != "Person":
            continue

        name = (row.get("name") or row.get("caption") or "").strip()
        if not name:
            continue

        candidate_record = {
            "name": name,
            "alias": row.get("aliases"),
            "gender": row.get("gender"),
            "state": "India", # Default broad scope, refined by constituency parsing
            "constituency": "Parliament of India",
            "house": "Lok Sabha / Rajya Sabha",
            "party": None,
        }
        candidates_batch.append(candidate_record)

        if len(candidates_batch) >= batch_size:
            await supabase.insert("candidates", candidates_batch)
            total_loaded += len(candidates_batch)
            logger.info(f"Loaded {total_loaded} parliamentarians into Supabase...")
            candidates_batch.clear()

        if limit and total_loaded >= limit:
            break

    if candidates_batch:
        await supabase.insert("candidates", candidates_batch)
        total_loaded += len(candidates_batch)

    logger.info(f"Successfully ingested {total_loaded} parliamentarians!")
    return total_loaded


if __name__ == "__main__":
    import asyncio
    asyncio.run(ingest_open_sansad(limit=100))
