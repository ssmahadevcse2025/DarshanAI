import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "DarshanAI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "darshanai_super_secret_jwt_key_2026_production_quality"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")
    )

    _raw_db_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./backend/darshanai.db"
    )

    if _raw_db_url.startswith("postgres://"):
        DATABASE_URL: str = _raw_db_url.replace(
            "postgres://",
            "postgresql://",
            1
        )
    else:
        DATABASE_URL: str = _raw_db_url

    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw_origins = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,"
            "http://localhost:5174,"
            "http://localhost:3000,"
            "http://127.0.0.1:5173,"
            "http://127.0.0.1:5174,"
            "http://127.0.0.1:3000"
        )

        return [
            origin.strip()
            for origin in raw_origins.split(",")
            if origin.strip()
        ]

    class Config:
        case_sensitive = True


settings = Settings()