import os
from pathlib import Path

# Automatically load .env if present
def _load_env_file():
    try:
        from dotenv import load_dotenv
        load_dotenv()
        return
    except ImportError:
        pass
    
    # Fallback: zero-dependency native parser
    root_dir = Path(__file__).resolve().parent.parent
    env_file = root_dir / ".env"
    if not env_file.is_file():
        return
    try:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        pass

_load_env_file()

try:
    from pydantic import BaseModel
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

class Settings(BaseModel):
    # Google AI Studio / Gemini Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    
    # Supabase Cloud Database Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", ""))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Cloudflare R2 Object Storage (S3-compatible)
    R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME") or "apnaneta-affidavits"
    R2_PUBLIC_BASE_URL: str = os.getenv("R2_PUBLIC_BASE_URL", "")
    
    # App Settings
    APP_ENV: str = os.getenv("APP_ENV", "production")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
