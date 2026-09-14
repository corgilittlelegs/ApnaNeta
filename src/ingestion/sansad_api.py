import logging
from typing import List, Dict, Any, Optional
import httpx
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.supabase_client import supabase

logger = logging.getLogger(__name__)

# Official Sansad internal REST API endpoints
SANSAD_BASE = "https://sansad.in"
API_LS_MEMBERS = f"{SANSAD_BASE}/api_ls/member"
API_RS_MEMBERS = f"{SANSAD_BASE}/api_rs/member"


class SansadScraper:
    """
    Consumer for Digital Sansad (sansad.in) internal REST endpoints.
    Captures attendance logs, Question Hour activity, and debate participation.
    """

    def __init__(self, rate_limiter: Optional[PoliteRateLimiter] = None):
        self.rate_limiter = rate_limiter or PoliteRateLimiter(min_delay=1.0, max_delay=2.5)

    async def fetch_members(self, house: str = "lok_sabha") -> List[Dict[str, Any]]:
        """
        Fetches the active roster of Lok Sabha or Rajya Sabha parliamentarians.
        """
        url = API_LS_MEMBERS if house.lower() == "lok_sabha" else API_RS_MEMBERS
        await self.rate_limiter.wait()
        logger.info(f"Fetching Sansad members for {house} from {url}")

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
            "Accept": "application/json",
            "Referer": "https://sansad.in/",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    # Handle both list responses and paginated { "data": [...] } responses
                    members = data if isinstance(data, list) else data.get("data", [])
                    logger.info(f"Successfully retrieved {len(members)} members for {house}.")
                    return members
                logger.warning(f"Sansad API returned status {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Failed to fetch Sansad members from {url}: {e}")
            return []

    async def sync_sansad_metrics(self, house: str = "lok_sabha") -> int:
        """
        Fetches live members and synchronizes attendance and legislative activity
        into the Supabase 'sansad_records' table.
        """
        members = await self.fetch_members(house=house)
        if not members:
            return 0

        synced_count = 0
        records_batch: List[Dict[str, Any]] = []

        for member in members:
            name = member.get("name") or member.get("memberName")
            if not name:
                continue

            # Normalized legislative profile
            record = {
                "house": "Lok Sabha" if house == "lok_sabha" else "Rajya Sabha",
                "attendance_rate": float(member.get("attendancePercent", 0.0) or 0.0),
                "questions_count": int(member.get("questionsCount", 0) or 0),
                "debates_count": int(member.get("debatesCount", 0) or 0),
                "private_member_bills": int(member.get("pmbCount", 0) or 0),
            }
            records_batch.append(record)

            if len(records_batch) >= 100:
                await supabase.insert("sansad_records", records_batch)
                synced_count += len(records_batch)
                records_batch.clear()

        if records_batch:
            await supabase.insert("sansad_records", records_batch)
            synced_count += len(records_batch)

        logger.info(f"Synchronized {synced_count} Sansad activity records into Supabase.")
        return synced_count


sansad_scraper = SansadScraper()
