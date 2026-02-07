import json
import logging
from typing import Any

from app.core.config import get_settings

try:
    import redis  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - environment fallback
    redis = None  # type: ignore


class RedisCache:
    def __init__(self) -> None:
        settings = get_settings()
        self._logger = logging.getLogger("app.cache")
        self._enabled = settings.cache_enabled and redis is not None
        self._default_ttl = settings.cache_ttl_seconds
        self._client = redis.Redis.from_url(settings.redis_url, decode_responses=True) if self._enabled else None

    @property
    def enabled(self) -> bool:
        return self._enabled

    def get_json(self, key: str) -> Any | None:
        if not self._enabled or not self._client:
            return None
        try:
            value = self._client.get(key)
        except Exception:
            self._logger.exception("Cache read failed for key=%s", key)
            return None
        if value is None:
            return None
        return json.loads(value)

    def set_json(self, key: str, payload: Any, ttl_seconds: int | None = None) -> None:
        if not self._enabled or not self._client:
            return
        try:
            self._client.setex(key, ttl_seconds or self._default_ttl, json.dumps(payload, default=str))
        except Exception:
            self._logger.exception("Cache write failed for key=%s", key)

    @staticmethod
    def build_key(prefix: str, **kwargs: Any) -> str:
        stable_payload = json.dumps(kwargs, sort_keys=True, default=str)
        return f"{prefix}:{stable_payload}"


cache = RedisCache()
