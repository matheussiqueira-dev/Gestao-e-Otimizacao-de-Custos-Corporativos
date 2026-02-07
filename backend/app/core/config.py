from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cost Intelligence Platform"
    app_version: str = "1.2.0"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False
    environment: str = "development"

    database_url: str = "postgresql+psycopg://cost_user:cost_pass@localhost:5432/costintel"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle_seconds: int = 1800
    redis_url: str = "redis://localhost:6379/0"
    cache_enabled: bool = True
    cache_ttl_seconds: int = 300

    allowed_origins: str = "http://localhost:3000"
    allowed_hosts: str = "*"

    auth_enabled: bool = False
    api_key_header_name: str = "X-API-Key"
    api_key_value: str = "costintel-dev-key"
    api_keys_json: str | None = None

    rate_limit_enabled: bool = True
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60

    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
