class LruTtlCache {
  constructor({ maxEntries = 50, defaultTtlMs = 30000 } = {}) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalHitLatencyMs: 0,
      totalMissLatencyMs: 0
    };
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses += 1;
      return null;
    }

    // Refresh key position in Map to maintain LRU ordering
    this.store.delete(key);
    this.store.set(key, entry);
    this.stats.hits += 1;
    return {
      value: entry.value,
      ttlRemainingSec: Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000))
    };
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.stats.evictions += 1;
      }
    }

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs
    });
  }

  recordLatency(isHit, ms) {
    if (isHit) {
      this.stats.totalHitLatencyMs += ms;
    } else {
      this.stats.totalMissLatencyMs += ms;
    }
  }

  flush() {
    const cleared = this.store.size;
    this.store.clear();
    return cleared;
  }

  getSnapshot() {
    const now = Date.now();
    const keys = [];
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > now) {
        keys.push({
          key,
          ttlRemainingSec: Math.ceil((entry.expiresAt - now) / 1000)
        });
      }
    }

    const total = this.stats.hits + this.stats.misses;
    return {
      entries: keys.length,
      maxEntries: this.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRatePct: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
      avgHitMs: this.stats.hits > 0 ? Number((this.stats.totalHitLatencyMs / this.stats.hits).toFixed(2)) : 0,
      avgMissMs: this.stats.misses > 0 ? Number((this.stats.totalMissLatencyMs / this.stats.misses).toFixed(2)) : 0,
      keys
    };
  }
}

module.exports = {
  LruTtlCache
};
