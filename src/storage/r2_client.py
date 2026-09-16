import hashlib
import logging
from typing import Optional
from config.settings import settings

logger = logging.getLogger(__name__)


class R2StorageClient:
    """
    S3-compatible storage client for Cloudflare R2.
    Stores immutable affidavit PDFs and bounding-box image crops with $0 egress fees.
    """

    def __init__(
        self,
        account_id: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
    ):
        self.account_id = account_id or settings.R2_ACCOUNT_ID
        self.access_key = access_key or settings.R2_ACCESS_KEY_ID
        self.secret_key = secret_key or settings.R2_SECRET_ACCESS_KEY
        self.bucket_name = bucket_name or settings.R2_BUCKET_NAME or "apnaneta-affidavits"
        self._s3_client = None

    @property
    def is_configured(self) -> bool:
        return bool(self.account_id and self.access_key and self.secret_key)

    def _get_client(self):
        if self._s3_client is None:
            if not self.is_configured:
                logger.warning("Cloudflare R2 credentials not configured. Operating in mock mode.")
                return None
            import boto3
            endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name="auto",
            )
        return self._s3_client

    def upload_affidavit_pdf(self, pdf_bytes: bytes, sha256_hash: Optional[str] = None) -> str:
        """
        Uploads an affidavit PDF using its SHA-256 hash as the immutable key.
        Returns the object key.
        """
        computed_hash = sha256_hash or hashlib.sha256(pdf_bytes).hexdigest()
        object_key = f"affidavits/{computed_hash}.pdf"

        client = self._get_client()
        if client:
            client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=pdf_bytes,
                ContentType="application/pdf",
            )
            logger.info(f"Uploaded affidavit to R2: {object_key}")
        else:
            logger.info(f"[Dry-Run] Would upload affidavit to R2: {object_key}")

        return object_key

    def upload_crop_image(self, image_bytes: bytes, crop_key: str) -> str:
        """
        Uploads a bounding-box visual proof crop (JPEG/PNG).
        """
        client = self._get_client()
        if client:
            client.put_object(
                Bucket=self.bucket_name,
                Key=f"crops/{crop_key}",
                Body=image_bytes,
                ContentType="image/jpeg",
            )
            logger.info(f"Uploaded crop to R2: crops/{crop_key}")
        else:
            logger.info(f"[Dry-Run] Would upload crop to R2: crops/{crop_key}")

        return f"crops/{crop_key}"


r2_storage = R2StorageClient()
