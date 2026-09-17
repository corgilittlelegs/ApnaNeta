import asyncio
import random
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class PoliteRateLimiter:
    """
    Asynchronous, jittered rate limiter to ensure polite scraping of public portals.
    Prevents triggering IP throttling, WAF alerts, or causing server strain.
    """

    def __init__(self, min_delay: float = 1.0, max_delay: float = 3.0):
        self.min_delay = min_delay
        self.max_delay = max_delay
        self._lock = None

    @property
    def lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def wait(self, custom_delay: Optional[float] = None) -> None:
        """Pauses execution with a randomized delay to simulate human browsing."""
        async with self.lock:
            delay = custom_delay if custom_delay is not None else random.uniform(self.min_delay, self.max_delay)
            logger.debug(f"Pacing request: sleeping for {delay:.2f} seconds...")
            await asyncio.sleep(delay)


async def retry_with_backoff(coro_fn, max_retries: int = 3, base_delay: float = 2.0):
    """
    Executes an async function with exponential backoff and jitter upon failure.
    """
    for attempt in range(1, max_retries + 1):
        try:
            return await coro_fn()
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Failed after {max_retries} attempts: {e}")
                raise
            delay = (base_delay ** attempt) + random.uniform(0.5, 1.5)
            logger.warning(f"Attempt {attempt} failed: {e}. Retrying in {delay:.2f}s...")
            await asyncio.sleep(delay)
