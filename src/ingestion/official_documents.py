"""Small, source-attributed discovery helpers for public government documents."""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, List, Set
from urllib.parse import urljoin, urlparse

try:
    import httpx
except ImportError:
    httpx = None

from src.storage.supabase_client import supabase

logger = logging.getLogger("OfficialDocuments")


def is_allowed_public_source(url: str, allowed_domains: Set[str]) -> bool:
    """Permits HTTPS links on an explicit government-domain allowlist only."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and any(host == domain or host.endswith(f".{domain}") for domain in allowed_domains)


class OfficialDocumentDiscovery:
    """Discover and record public documents without guessing download URLs."""

    def __init__(self, allowed_domains: Set[str]):
        self.allowed_domains = {domain.lower() for domain in allowed_domains}

    async def discover_pdf_links(self, index_url: str, required_text: str = "") -> List[str]:
        if httpx is None:
            raise ImportError("httpx is required for official document discovery")
        if not is_allowed_public_source(index_url, self.allowed_domains):
            raise ValueError(f"Index URL is outside the approved source allowlist: {index_url}")

        from bs4 import BeautifulSoup

        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            response = await client.get(index_url)
            response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        links: List[str] = []
        for anchor in soup.find_all("a", href=True):
            href = urljoin(index_url, anchor["href"])
            label = anchor.get_text(" ", strip=True).lower()
            if not is_allowed_public_source(href, self.allowed_domains):
                continue
            if required_text and required_text.lower() not in f"{label} {href.lower()}":
                continue
            if ".pdf" in href.lower() or "download" in href.lower() or "pdf" in label:
                links.append(href)
        return sorted(set(links))

    async def record_documents(self, authority: str, document_type: str, urls: List[str]) -> int:
        """Stores source metadata only; downloading/parsing is a separate step."""
        now = datetime.now(timezone.utc).isoformat()
        records: List[Dict[str, object]] = []
        for url in urls:
            records.append(
                {
                    "authority": authority,
                    "document_type": document_type,
                    "source_url": url,
                    "source_sha256": hashlib.sha256(url.encode("utf-8")).hexdigest(),
                    "retrieved_at": now,
                    "is_official": True,
                    "parser_version": "discovery-v1",
                    "review_status": "unreviewed",
                }
            )
        if records:
            await supabase.upsert("source_documents", records, on_conflict="source_url")
        logger.info("Recorded %d %s source document(s) from %s.", len(records), document_type, authority)
        return len(records)
