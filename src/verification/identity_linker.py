"""Review-gated cross-election candidate identity linking."""

import asyncio
import logging
from itertools import combinations
from typing import Any, Dict, List

from src.storage.supabase_client import supabase
from src.verification.entity_resolution import entity_resolver

logger = logging.getLogger("IdentityLinker")


class IdentityLinker:
    """Proposes, but never automatically applies, cross-election identities."""

    @staticmethod
    def _identity_record(candidate: Dict[str, Any], affidavit: Dict[str, Any]) -> Dict[str, Any]:
        raw = affidavit.get("raw_payload") or {}
        declared = raw.get("candidate") or {}
        return {
            "id": candidate.get("id"),
            "name": candidate.get("name") or declared.get("name") or "",
            "state": candidate.get("state") or declared.get("state") or "",
            "filing_year": affidavit.get("filing_year"),
            "age": declared.get("age"),
            "father_or_spouse_name": declared.get("father_or_spouse_name"),
        }

    async def propose_links(self, threshold: float = 0.88) -> List[Dict[str, Any]]:
        """Create high-confidence pending-review links between distinct profiles."""
        candidates = await supabase.select_all("candidates")
        affidavits = await supabase.select_all("affidavits")
        by_candidate = {candidate.get("id"): candidate for candidate in candidates if candidate.get("id")}
        identities = [
            self._identity_record(by_candidate[affidavit["candidate_id"]], affidavit)
            for affidavit in affidavits
            if affidavit.get("candidate_id") in by_candidate and affidavit.get("filing_year")
        ]

        proposals: List[Dict[str, Any]] = []
        for left, right in combinations(identities, 2):
            if left["id"] == right["id"] or left["filing_year"] == right["filing_year"]:
                continue
            matched, score, rationale = entity_resolver.is_same_candidate(left, right, threshold=threshold)
            if not matched:
                continue

            candidate_a_id, candidate_b_id = sorted((left["id"], right["id"]))
            proposal = {
                "candidate_a_id": candidate_a_id,
                "candidate_b_id": candidate_b_id,
                "confidence_score": score,
                "rationale": rationale,
                "status": "pending_review",
            }
            await supabase.upsert(
                "identity_resolution_links",
                [proposal],
                on_conflict="candidate_a_id,candidate_b_id",
            )
            proposals.append(proposal)
        logger.info("Created or refreshed %d review-gated identity proposals.", len(proposals))
        return proposals


identity_linker = IdentityLinker()


if __name__ == "__main__":
    asyncio.run(identity_linker.propose_links())
