from typing import Dict, Any, List, Optional

try:
    import httpx
except ImportError:
    httpx = None

from config.settings import settings


class SupabaseClient:
    """
    Lightweight, zero-dependency async client for Supabase PostgREST.
    Communicates via HTTPS PostgREST endpoints using the service role key.
    """

    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        raw_url = url or settings.SUPABASE_URL or ""
        raw_key = key or settings.SUPABASE_SERVICE_ROLE_KEY or ""
        clean_url = raw_url.strip().rstrip("/")
        if clean_url.endswith("/rest/v1"):
            clean_url = clean_url[:-len("/rest/v1")].rstrip("/")
        elif clean_url.endswith("/rest"):
            clean_url = clean_url[:-len("/rest")].rstrip("/")

        self.url = clean_url
        self.key = raw_key.strip()
        self.rest_url = f"{self.url}/rest/v1" if self.url else ""
        self._client: Optional[Any] = None
        if not self.url or not self.key:
            import logging
            logging.getLogger(__name__).warning("Supabase URL or service_role key not configured!")

    async def get_client(self) -> Any:
        """Returns a shared persistent httpx.AsyncClient with connection pooling."""
        if httpx is None:
            raise ImportError("httpx is required for SupabaseClient")
        if self._client is None or self._client.is_closed:
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=30.0)
            self._client = httpx.AsyncClient(timeout=30.0, limits=limits)
        return self._client

    async def close(self) -> None:
        """Closes the underlying HTTP client session."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

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
        
        client = await self.get_client()
        response = await client.post(
            f"{self.rest_url}/{table}",
            headers=self._headers(),
            json=records,
        )
        if response.is_error:
            import logging
            logging.getLogger(__name__).error(f"Supabase POST {table} error ({response.status_code}): {response.text}")
        response.raise_for_status()
        return response.json() if response.text else []

    async def select(
        self,
        table: str,
        params: Optional[Dict[str, str]] = None,
        *,
        columns: Optional[str] = None,
        eq: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        order: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Dict[str, Any]]:
        """
        Query records from a Supabase table.
        Supports standard params dictionary or convenience keyword arguments
        (columns, eq, limit, order).
        """
        if not self.rest_url or not self.key:
            return []

        query_params = dict(params) if params else {}
        if columns:
            query_params["select"] = columns
        if kwargs.get("select"):
            query_params["select"] = str(kwargs["select"])
        if eq and isinstance(eq, dict):
            for k, v in eq.items():
                query_params[k] = f"eq.{v}"
        if limit is not None:
            query_params["limit"] = str(limit)
        if order is not None:
            query_params["order"] = str(order)
            
        client = await self.get_client()
        response = await client.get(
            f"{self.rest_url}/{table}",
            headers=self._headers(),
            params=query_params,
        )
        if response.is_error:
            import logging
            logging.getLogger(__name__).error(f"Supabase GET {table} error ({response.status_code}): {response.text}")
        response.raise_for_status()
        return response.json()

    async def select_all(
        self,
        table: str,
        params: Optional[Dict[str, str]] = None,
        batch_size: int = 1000,
        **kwargs: Any,
    ) -> List[Dict[str, Any]]:
        """
        Fetches all records from a table using automatic offset pagination.
        Ensures workers process complete datasets rather than arbitrary truncated subsets.
        """
        all_records = []
        offset = 0
        while True:
            batch_params = dict(params) if params else {}
            batch_params["limit"] = str(batch_size)
            batch_params["offset"] = str(offset)
            if "order" not in batch_params and "order" not in kwargs:
                batch_params["order"] = "id.asc"
            batch = await self.select(table, params=batch_params, **kwargs)
            if not batch:
                break
            all_records.extend(batch)
            if len(batch) < batch_size:
                break
            offset += batch_size
        return all_records

    async def upsert(self, table: str, records: List[Dict[str, Any]], on_conflict: str) -> List[Dict[str, Any]]:
        """Upsert records with conflict handling."""
        if not self.rest_url or not self.key:
            return []
            
        headers = self._headers()
        headers["Prefer"] = f"resolution=merge-duplicates,return=representation"
        
        client = await self.get_client()
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

    async def update(self, table: str, values: Dict[str, Any], params: Dict[str, str]) -> List[Dict[str, Any]]:
        """Update records in a Supabase table matching params."""
        if not self.rest_url or not self.key:
            return []
            
        client = await self.get_client()
        response = await client.patch(
            f"{self.rest_url}/{table}",
            headers=self._headers(),
            params=params,
            json=values,
        )
        if response.is_error:
            import logging
            logging.getLogger(__name__).error(f"Supabase PATCH {table} error ({response.status_code}): {response.text}")
        response.raise_for_status()
        return response.json() if response.text else []


supabase = SupabaseClient()
