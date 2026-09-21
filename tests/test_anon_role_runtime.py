import os
import unittest

try:
    import httpx
except ImportError:
    httpx = None


class TestAnonRoleRuntime(unittest.IsolatedAsyncioTestCase):
    """
    Integration test validating that the deployed or local Supabase instance
    strictly enforces the anonymous role least-privilege policy (P0 protection).

    To run this test against a live or local Supabase instance:
        export SUPABASE_URL="http://localhost:54321" # or https://your-project.supabase.co
        export SUPABASE_ANON_KEY="your-anon-key"
        python -m unittest tests/test_anon_role_runtime.py
    """

    def setUp(self):
        self.supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL", "")
        self.anon_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY", "")
        clean_url = self.supabase_url.strip().rstrip("/")
        if clean_url.endswith("/rest/v1"):
            clean_url = clean_url[:-len("/rest/v1")].rstrip("/")
        self.rest_url = f"{clean_url}/rest/v1" if clean_url else ""

    async def test_raw_payload_forbidden_for_anon_role(self):
        if httpx is None:
            self.skipTest("Skipping test: httpx is not installed in the local test environment.")

        if not self.rest_url or not self.anon_key:
            self.skipTest(
                "Skipping runtime anon-role integration test: SUPABASE_URL and SUPABASE_ANON_KEY "
                "environment variables not configured. Set them to test against a disposable/local Supabase instance."
            )

        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Attempt to query raw_payload directly on affidavits table
            resp_raw = await client.get(
                f"{self.rest_url}/affidavits?select=raw_payload&limit=1",
                headers=headers,
            )
            # PostgREST returns 400 or 403 when a column is not selectable by the requesting role
            self.assertIn(
                resp_raw.status_code,
                [400, 403, 404],
                f"Expected denial (400/403) when anon requests raw_payload, got {resp_raw.status_code}: {resp_raw.text}",
            )

            # 2. Attempt to query select=* on affidavits table
            resp_wildcard = await client.get(
                f"{self.rest_url}/affidavits?select=*&limit=1",
                headers=headers,
            )
            # PostgREST either rejects wildcard or returns only permitted columns (without raw_payload)
            if resp_wildcard.status_code == 200 and resp_wildcard.json():
                first_row = resp_wildcard.json()[0]
                self.assertNotIn(
                    "raw_payload",
                    first_row,
                    "CRITICAL: raw_payload was returned in anon select=* query!",
                )

            # 3. Verify that public_affidavits view or safe columns work normally (read access works)
            resp_safe = await client.get(
                f"{self.rest_url}/public_affidavits?limit=1",
                headers=headers,
            )
            self.assertIn(
                resp_safe.status_code,
                [200, 404],
            )


if __name__ == "__main__":
    unittest.main()
