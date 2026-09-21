"""
Apna Neta: Vidhan Sabha (State Legislative Assembly) Seed Loader
Seeds verified Form 26 sworn affidavits and primary-source metrics
for prominent State Assembly leaders directly into Supabase.
"""

import asyncio
import logging
from typing import List, Dict, Any
from src.storage.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VidhanSabhaSeeder")

PROMINENT_VIDHAN_SABHA_CANDIDATES: List[Dict[str, Any]] = [
    {
        "name": "Ajit Anantrao Pawar",
        "alias": "Ajitdada",
        "constituency": "Baramati",
        "state": "Maharashtra",
        "house": "Vidhan Sabha",
        "party": "Nationalist Congress Party",
        "total_movable_assets": 266000000.0,
        "total_immovable_assets": 979400000.0,
        "total_liabilities": 212100000.0,
        "total_net_worth": 1033300000.0,
        "total_five_year_income": 43500000.0,
        "criminal_cases_count": 0,
        "serious_criminal_cases_count": 0,
        "protest_cases_count": 0,
        "has_arithmetic_discrepancy": False,
        "delta_movable": 0.0,
        "delta_immovable": 0.0,
        "wealth_discrepancy_ratio": 2.37,
        "has_anomalous_wealth_ratio": False,
        "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Ajit_Pawar_2023.jpg/330px-Ajit_Pawar_2023.jpg",
        "photo_source": "wikimedia",
        "photo_attribution": "Wikimedia Commons • CC BY-SA 4.0",
        "photo_license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    {
        "name": "Devendra Gangadharrao Fadnavis",
        "alias": "Devendra Fadnavis",
        "constituency": "Nagpur South West",
        "state": "Maharashtra",
        "house": "Vidhan Sabha",
        "party": "Bharatiya Janata Party",
        "total_movable_assets": 56300000.0,
        "total_immovable_assets": 76000000.0,
        "total_liabilities": 6200000.0,
        "total_net_worth": 126100000.0,
        "total_five_year_income": 38200000.0,
        "criminal_cases_count": 4,
        "serious_criminal_cases_count": 0,
        "protest_cases_count": 4,
        "has_arithmetic_discrepancy": False,
        "delta_movable": 0.0,
        "delta_immovable": 0.0,
        "wealth_discrepancy_ratio": 3.3,
        "has_anomalous_wealth_ratio": False,
        "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Devendra_Fadnavis_in_2024.jpg/330px-Devendra_Fadnavis_in_2024.jpg",
        "photo_source": "wikimedia",
        "photo_attribution": "Wikimedia Commons • CC BY-SA 4.0",
        "photo_license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    {
        "name": "Eknath Sambhaji Shinde",
        "alias": "Eknath Shinde",
        "constituency": "Kopri-Pachpakhadi",
        "state": "Maharashtra",
        "house": "Vidhan Sabha",
        "party": "Shiv Sena",
        "total_movable_assets": 118000000.0,
        "total_immovable_assets": 257000000.0,
        "total_liabilities": 52000000.0,
        "total_net_worth": 323000000.0,
        "total_five_year_income": 41000000.0,
        "criminal_cases_count": 18,
        "serious_criminal_cases_count": 0,
        "protest_cases_count": 18,
        "has_arithmetic_discrepancy": False,
        "delta_movable": 0.0,
        "delta_immovable": 0.0,
        "wealth_discrepancy_ratio": 7.8,
        "has_anomalous_wealth_ratio": False,
        "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Eknath_Shinde_2022.jpg/330px-Eknath_Shinde_2022.jpg",
        "photo_source": "wikimedia",
        "photo_attribution": "Wikimedia Commons • CC BY-SA 4.0",
        "photo_license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    {
        "name": "Yogi Adityanath",
        "alias": "Ajay Mohan Singh Bisht",
        "constituency": "Gorakhpur Urban",
        "state": "Uttar Pradesh",
        "house": "Vidhan Sabha",
        "party": "Bharatiya Janata Party",
        "total_movable_assets": 15400000.0,
        "total_immovable_assets": 0.0,
        "total_liabilities": 0.0,
        "total_net_worth": 15400000.0,
        "total_five_year_income": 13200000.0,
        "criminal_cases_count": 0,
        "serious_criminal_cases_count": 0,
        "protest_cases_count": 0,
        "has_arithmetic_discrepancy": False,
        "delta_movable": 0.0,
        "delta_immovable": 0.0,
        "wealth_discrepancy_ratio": 1.16,
        "has_anomalous_wealth_ratio": False,
        "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Yogi_Adityanath_in_2023.jpg/330px-Yogi_Adityanath_in_2023.jpg",
        "photo_source": "wikimedia",
        "photo_attribution": "Wikimedia Commons • GODL-India",
        "photo_license_url": "https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf",
    },
]


async def seed_vidhan_sabha() -> int:
    """Inserts or updates verified Vidhan Sabha records in Supabase."""
    logger.info(f"Seeding {len(PROMINENT_VIDHAN_SABHA_CANDIDATES)} Vidhan Sabha politicians into Supabase...")

    # Check for existing candidates to prevent duplicates
    inserted_count = 0
    for cand in PROMINENT_VIDHAN_SABHA_CANDIDATES:
        try:
            existing = await supabase.select(
                "candidates",
                {
                    "select": "id,name",
                    "name": f"eq.{cand['name']}",
                    "house": "eq.Vidhan Sabha",
                    "limit": "1",
                },
            )
            if existing:
                cand_id = existing[0]["id"]
                await supabase.update("candidates", cand, {"id": f"eq.{cand_id}"})
                logger.info(f"✓ Updated existing Vidhan Sabha record: {cand['name']} ({cand['constituency']})")
            else:
                res = await supabase.insert("candidates", [cand])
                if res:
                    logger.info(f"✓ Inserted new Vidhan Sabha record: {cand['name']} ({cand['constituency']})")
                    inserted_count += 1
        except Exception as e:
            logger.warning(f"Error seeding candidate {cand['name']}: {e}")

    logger.info(f"✅ Vidhan Sabha seeding complete! Total processed: {len(PROMINENT_VIDHAN_SABHA_CANDIDATES)}")
    return inserted_count


if __name__ == "__main__":
    asyncio.run(seed_vidhan_sabha())
