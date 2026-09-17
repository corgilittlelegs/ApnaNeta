import asyncio
import hashlib
import time
import unittest
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.r2_client import R2StorageClient


class TestIngestion(unittest.IsolatedAsyncioTestCase):

    async def test_polite_rate_limiter_pacing(self):
        limiter = PoliteRateLimiter(min_delay=0.1, max_delay=0.2)
        start_time = time.time()
        await limiter.wait()
        elapsed = time.time() - start_time
        self.assertGreaterEqual(elapsed, 0.09, f"Limiter slept for {elapsed}s, expected at least 0.1s")

    def test_r2_client_key_generation(self):
        client = R2StorageClient(bucket_name="test-bucket")
        self.assertFalse(client.is_configured)

        fake_pdf = b"%PDF-1.4 Mock Candidate Affidavit Content"
        expected_hash = hashlib.sha256(fake_pdf).hexdigest()

        key = client.upload_affidavit_pdf(fake_pdf)
        self.assertEqual(key, f"affidavits/{expected_hash}.pdf")

        crop_key = client.upload_crop_image(b"fake_jpg_bytes", "test_crop_1.jpg")
        self.assertEqual(crop_key, "crops/test_crop_1.jpg")


if __name__ == "__main__":
    unittest.main()
