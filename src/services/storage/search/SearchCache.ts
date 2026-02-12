interface CacheEntry {
  ids: string[];
  timestamp: number;
}

export class SearchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];

  constructor(
    private maxSize: number = 1000,
    private ttl: number = 10 * 60 * 1000,
  ) {}

  get(key: string): string[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      return null;
    }

    // Update LRU order
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    return entry.ids;
  }

  set(key: string, ids: string[]): void {
    // Evict if full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      ids,
      timestamp: Date.now(),
    });
    this.accessOrder.push(key);
  }

  invalidate(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
      }
    }
  }
}
