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
        self.session_inactivity_timeout_minutes = int(
            os.getenv("SESSION_INACTIVITY_TIMEOUT_MINUTES", "5")
        )
        self.jwt_secret_key = os.getenv(
            "JWT_SECRET_KEY",
            "eREQUEST360_DEV_SECRET_KEY_DO_NOT_USE_IN_PRODUCTION_32CHAR"
        )
        if self.environment.lower() == "production" and not os.getenv("JWT_SECRET_KEY"):
            raise ValueError(
                "JWT_SECRET_KEY environment variable MUST be explicitly set in production environment"
            )


settings = Settings()
