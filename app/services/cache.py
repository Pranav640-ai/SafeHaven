import time
from typing import Any, Dict, Generic, Optional, Tuple, TypeVar
from datetime import datetime, timezone

T = TypeVar("T")


class CacheEntry(Generic[T]):
    def __init__(self, value: T, ttl_seconds: int):
        self.value: T = value
        self.cached_at: float = time.time()
        self.expires_at: float = self.cached_at + ttl_seconds
        self.ttl_seconds: int = ttl_seconds

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    @property
    def age_seconds(self) -> float:
        return max(0.0, time.time() - self.cached_at)


class MemoryCache:
    def __init__(self):
        # Namespace -> Key -> CacheEntry
        self._store: Dict[str, Dict[str, CacheEntry[Any]]] = {}

    def get(self, namespace: str, key: str, allow_stale: bool = False) -> Tuple[Optional[Any], Optional[float]]:
        """
        Retrieves a cached value.
        Returns: (value, age_seconds) or (None, None)
        """
        ns_dict = self._store.get(namespace)
        if not ns_dict:
            return None, None

        entry = ns_dict.get(key)
        if not entry:
            return None, None

        if entry.is_expired and not allow_stale:
            # Expired and stale not allowed
            return None, None

        return entry.value, entry.age_seconds

    def set(self, namespace: str, key: str, value: Any, ttl_seconds: int) -> None:
        if namespace not in self._store:
            self._store[namespace] = {}
        self._store[namespace][key] = CacheEntry(value=value, ttl_seconds=ttl_seconds)

    def invalidate(self, namespace: str, key: str) -> None:
        if namespace in self._store and key in self._store[namespace]:
            del self._store[namespace][key]

    def clear(self, namespace: Optional[str] = None) -> None:
        if namespace:
            self._store.pop(namespace, None)
        else:
            self._store.clear()


cache = MemoryCache()
