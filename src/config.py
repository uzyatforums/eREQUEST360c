import os
from pathlib import Path


env_path = Path(__file__).resolve().parents[1] / ".env"
if env_path.exists():
    from dotenv import load_dotenv

    load_dotenv(env_path)


class Settings:
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./dev.db")


settings = Settings()
