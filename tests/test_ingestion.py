import asyncio
import hashlib
import time
import pytest
from src.utils.rate_limiter import PoliteRateLimiter
from src.storage.r2_client import R2StorageClient


@pytest.mark.asyncio
async def test_polite_rate_limiter_pacing():
    limiter = PoliteRateLimiter(min_delay=0.1, max_delay=0.2)
    start_time = time.time()
    await limiter.wait()
    elapsed = time.time() - start_time
    assert elapsed >= 0.09, f"Limiter slept for {elapsed}s, expected at least 0.1s"


def test_r2_client_key_generation():
    client = R2StorageClient(bucket_name="test-bucket")
    assert not client.is_configured  # Default mock mode when env vars not set

    fake_pdf = b"%PDF-1.4 Mock Candidate Affidavit Content"
    expected_hash = hashlib.sha256(fake_pdf).hexdigest()

    key = client.upload_affidavit_pdf(fake_pdf)
    assert key == f"affidavits/{expected_hash}.pdf"

    crop_key = client.upload_crop_image(b"fake_jpg_bytes", "test_crop_1.jpg")
    assert crop_key == "crops/test_crop_1.jpg"
