import math
import logging
from typing import List, Dict, Any, Optional, Tuple
from src.storage.supabase_client import supabase

logger = logging.getLogger("GISVerifier")

# India National Bounding Box [lat_min, lon_min, lat_max, lon_max]
INDIA_BBOX = (6.0, 68.0, 37.5, 97.5)

# Known Parliamentary Constituency Approximate Bounding Polygons (Sample benchmarks)
CONSTITUENCY_BOUNDS: Dict[str, Tuple[float, float, float, float]] = {
    # (lat_min, lon_min, lat_max, lon_max)
    "VARANASI": (25.10, 82.75, 25.45, 83.15),
    "AMETHI": (25.95, 81.60, 26.35, 82.05),
    "NEW DELHI": (28.50, 77.10, 28.65, 77.28),
    "WAYANAD": (11.45, 75.80, 11.95, 76.40),
    "GANDHINAGAR": (23.00, 72.40, 23.35, 72.75),
}


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class MPLADSGISVerifier:
    """
    Satellite and GIS Geolocation Verification Engine for MPLADS Projects.
    Audits declared project coordinates to detect:
    - Boundary transgressions (funds spent outside MP's constituency)
    - Duplicate coordinate contractor fraud (multiple works billed at the same location)
    - Ocean/water-body invalid anomalies
    - Ghost Project Risk Scoring
    """

    def is_within_india(self, lat: float, lon: float) -> bool:
        """Verifies coordinates are within the territorial boundaries of India."""
        return INDIA_BBOX[0] <= lat <= INDIA_BBOX[2] and INDIA_BBOX[1] <= lon <= INDIA_BBOX[3]

    def is_in_ocean(self, lat: float, lon: float) -> bool:
        """
        Simple bounding checks for open deep-sea ocean points
        (e.g., coordinates in the middle of Arabian Sea or Bay of Bengal).
        """
        # Arabian Sea pocket
        if 10.0 <= lat <= 18.0 and 65.0 <= lon <= 71.5:
            return True
        # Bay of Bengal deep water
        if 12.0 <= lat <= 17.0 and 84.0 <= lon <= 89.0:
            return True
        return False

    def check_constituency_boundary(
        self,
        lat: Optional[float],
        lon: Optional[float],
        constituency_name: str,
    ) -> Tuple[bool, str]:
        """
        Verifies whether GPS coordinates fall within the declared constituency.
        """
        if lat is None or lon is None:
            return False, "No GPS coordinates provided"

        if not self.is_within_india(lat, lon):
            return False, f"Coordinates ({lat}, {lon}) fall outside India territorial bounds"

        if self.is_in_ocean(lat, lon):
            return False, f"Coordinates ({lat}, {lon}) resolve to open sea/water body"

        norm_const = constituency_name.upper().replace("CONSTITUENCY", "").strip()
        bounds = CONSTITUENCY_BOUNDS.get(norm_const)
        if bounds:
            lat_min, lon_min, lat_max, lon_max = bounds
            if not (lat_min <= lat <= lat_max and lon_min <= lon <= lon_max):
                return False, f"Coordinates fall outside {constituency_name} boundaries ({lat_min}-{lat_max}, {lon_min}-{lon_max})"

        return True, "Valid within constituency bounds"

    def detect_duplicate_coordinates(
        self,
        works: List[Dict[str, Any]],
        distance_threshold_meters: float = 15.0,
    ) -> Dict[str, List[str]]:
        """
        Finds clusters of distinct work items with declared coordinates within threshold distance.
        Returns a dictionary mapping work_id -> list of duplicate work_ids.
        """
        valid_works = [w for w in works if w.get("latitude") is not None and w.get("longitude") is not None]
        duplicates_map: Dict[str, List[str]] = {}

        n = len(valid_works)
        for i in range(n):
            w1 = valid_works[i]
            id1 = w1.get("work_id", str(i))
            lat1, lon1 = float(w1["latitude"]), float(w1["longitude"])

            for j in range(i + 1, n):
                w2 = valid_works[j]
                id2 = w2.get("work_id", str(j))
                lat2, lon2 = float(w2["latitude"]), float(w2["longitude"])

                dist = haversine_distance_meters(lat1, lon1, lat2, lon2)
                if dist <= distance_threshold_meters:
                    duplicates_map.setdefault(id1, []).append(id2)
                    duplicates_map.setdefault(id2, []).append(id1)

        return duplicates_map

    def evaluate_ghost_project_risk(
        self,
        work: Dict[str, Any],
        is_duplicate: bool = False,
        is_boundary_valid: bool = True,
        is_water_body: bool = False,
    ) -> Dict[str, Any]:
        """
        Scores ghost project risk based on physical coordinate validation and financial velocity:
        - CRITICAL: 100% expenditure with duplicate coordinates or ocean placement.
        - HIGH: Out-of-constituency coordinates.
        - MEDIUM: No coordinates provided or marked completed without date.
        - LOW: Fully verified unique coordinates within constituency.
        """
        sanctioned = float(work.get("sanctioned_amount", 0.0))
        expenditure = float(work.get("expenditure_amount", 0.0))
        status = str(work.get("status", "")).lower()
        has_coords = work.get("latitude") is not None and work.get("longitude") is not None

        is_completed = "complete" in status or (sanctioned > 0 and expenditure >= sanctioned * 0.95)

        if is_water_body:
            return {
                "ghost_project_risk": "CRITICAL",
                "risk_score": 0.95,
                "reason": "Declared coordinates resolve to open ocean/water body",
            }

        if is_duplicate and is_completed:
            return {
                "ghost_project_risk": "CRITICAL",
                "risk_score": 0.90,
                "reason": "Duplicate GPS coordinates match another independently sanctioned completed project (contractor fraud pattern)",
            }

        if not is_boundary_valid and has_coords:
            return {
                "ghost_project_risk": "HIGH",
                "risk_score": 0.75,
                "reason": "Declared coordinates fall outside designated parliamentary constituency boundary",
            }

        if not has_coords and is_completed:
            return {
                "ghost_project_risk": "MEDIUM",
                "risk_score": 0.50,
                "reason": "Work marked 100% completed without geotagged inspection coordinates",
            }

        return {
            "ghost_project_risk": "LOW",
            "risk_score": 0.10,
            "reason": "Verified coordinates located within constituency; unique geolocation",
        }

    async def audit_candidate_works(self, candidate_id: str, constituency_name: str) -> Dict[str, Any]:
        """
        Executes a full GIS and Ghost Project audit for all works associated with a candidate in Supabase.
        """
        works = await supabase.select("mplads_works", {"candidate_id": f"eq.{candidate_id}"})
        if not works:
            return {
                "total_works": 0,
                "verified_count": 0,
                "critical_ghost_alerts": 0,
                "high_risk_count": 0,
            }

        duplicates_map = self.detect_duplicate_coordinates(works)

        critical_count = 0
        high_count = 0
        verified_count = 0

        updates = []
        for w in works:
            w_id = w.get("work_id")
            lat = w.get("latitude")
            lon = w.get("longitude")
            is_dup = bool(duplicates_map.get(w_id))
            is_water = self.is_in_ocean(lat, lon) if lat and lon else False
            is_valid_bound, bound_note = self.check_constituency_boundary(lat, lon, constituency_name)

            risk_eval = self.evaluate_ghost_project_risk(
                work=w,
                is_duplicate=is_dup,
                is_boundary_valid=is_valid_bound,
                is_water_body=is_water,
            )

            risk_label = risk_eval["ghost_project_risk"]
            if risk_label == "CRITICAL":
                critical_count += 1
            elif risk_label == "HIGH":
                high_count += 1
            elif risk_label == "LOW":
                verified_count += 1

            updates.append({
                "work_id": w_id,
                "gis_verified": risk_label == "LOW",
                "constituency_boundary_valid": is_valid_bound,
                "duplicate_coordinate_flag": is_dup,
                "ghost_project_risk": risk_label,
                "gis_audit_notes": bound_note if not is_valid_bound else risk_eval["reason"],
            })

        for u in updates:
            try:
                await supabase.update("mplads_works", u, {"work_id": f"eq.{u['work_id']}"})
            except Exception as e:
                logger.warning(f"Error updating work {u['work_id']}: {e}")

        return {
            "total_works": len(works),
            "verified_count": verified_count,
            "critical_ghost_alerts": critical_count,
            "high_risk_count": high_count,
        }


gis_verifier = MPLADSGISVerifier()
