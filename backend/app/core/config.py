from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cost Intelligence Platform"
    app_version: str = "1.1.0"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False
    environment: str = "development"

    database_url: str = "postgresql+psycopg://cost_user:cost_pass@localhost:5432/costintel"
    redis_url: str = "redis://localhost:6379/0"
    cache_enabled: bool = True
    cache_ttl_seconds: int = 300

    allowed_origins: str = "http://localhost:3000"
    allowed_hosts: str = "*"

    auth_enabled: bool = False
    api_key_header_name: str = "X-API-Key"
    api_key_value: str = "costintel-dev-key"

    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
