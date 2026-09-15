from typing import Dict, Any, List, Optional
import httpx
from config.settings import settings


class SupabaseClient:
    """
    Lightweight, zero-dependency async client for Supabase PostgREST.
    Communicates via HTTPS PostgREST endpoints using the service role key.
    """

    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        self.url = (url or settings.SUPABASE_URL).rstrip("/")
        self.key = key or settings.SUPABASE_SERVICE_ROLE_KEY
        self.rest_url = f"{self.url}/rest/v1" if self.url else ""

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def insert(self, table: str, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Insert records into a Supabase table."""
        if not self.rest_url or not self.key:
            return []  # Gracefully handles unconfigured local dry runs
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.rest_url}/{table}",
                headers=self._headers(),
                json=records,
            )
            if response.is_error:
                import logging
                logging.getLogger(__name__).error(f"Supabase POST {table} error ({response.status_code}): {response.text}")
            response.raise_for_status()
            return response.json()

    async def select(self, table: str, params: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Query records from a Supabase table."""
        if not self.rest_url or not self.key:
            return []
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.rest_url}/{table}",
                headers=self._headers(),
                params=params or {},
            )
            if response.is_error:
                import logging
                logging.getLogger(__name__).error(f"Supabase GET {table} error ({response.status_code}): {response.text}")
            response.raise_for_status()
            return response.json()

    async def upsert(self, table: str, records: List[Dict[str, Any]], on_conflict: str) -> List[Dict[str, Any]]:
        """Upsert records with conflict handling."""
        if not self.rest_url or not self.key:
            return []
            
        headers = self._headers()
        headers["Prefer"] = f"resolution=merge-duplicates,return=representation"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.rest_url}/{table}?on_conflict={on_conflict}",
                headers=headers,
                json=records,
            )
            if response.is_error:
                import logging
                logging.getLogger(__name__).error(f"Supabase UPSERT {table} error ({response.status_code}): {response.text}")
            response.raise_for_status()
            return response.json()


supabase = SupabaseClient()
