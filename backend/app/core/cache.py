import json
from typing import Any

import redis

from app.core.config import get_settings


class RedisCache:
    def __init__(self) -> None:
        settings = get_settings()
        self._enabled = settings.cache_enabled
        self._default_ttl = settings.cache_ttl_seconds
        self._client = redis.Redis.from_url(settings.redis_url, decode_responses=True) if self._enabled else None

    @property
    def enabled(self) -> bool:
        return self._enabled

    def get_json(self, key: str) -> Any | None:
        if not self._enabled or not self._client:
            return None
        value = self._client.get(key)
        if value is None:
            return None
        return json.loads(value)

    def set_json(self, key: str, payload: Any, ttl_seconds: int | None = None) -> None:
        if not self._enabled or not self._client:
            return
        self._client.setex(key, ttl_seconds or self._default_ttl, json.dumps(payload, default=str))

    @staticmethod
    def build_key(prefix: str, **kwargs: Any) -> str:
        stable_payload = json.dumps(kwargs, sort_keys=True, default=str)
        return f"{prefix}:{stable_payload}"


cache = RedisCache()

