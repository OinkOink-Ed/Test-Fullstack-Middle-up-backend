interface CachedSearchResult {
  documentIds: string[];
  cachedAt: number;
}

export class SearchCache {
  private cache: Map<string, CachedSearchResult> = new Map();
  private accessHistory: string[] = [];

  constructor(
    private maxEntries: number = 1000,
    private entryTTLMs: number = 10 * 60 * 1000,
  ) {}

  get(cacheKey: string): string[] | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > this.entryTTLMs) {
      this.cache.delete(cacheKey);
      this.accessHistory = this.accessHistory.filter((key) => key !== cacheKey);
      return null;
    }

    // Update LRU order
    this.accessHistory = this.accessHistory.filter((key) => key !== cacheKey);
    this.accessHistory.push(cacheKey);

    return entry.documentIds;
  }

  set(cacheKey: string, documentIds: string[]): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.accessHistory.shift();
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      documentIds,
      cachedAt: Date.now(),
    });
    this.accessHistory.push(cacheKey);
  }

  invalidate(): void {
    this.cache.clear();
    this.accessHistory = [];
  }

  removeExpired(): void {
    const now = Date.now();
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > this.entryTTLMs) {
        this.cache.delete(cacheKey);
        this.accessHistory = this.accessHistory.filter(
          (key) => key !== cacheKey,
        );
      }
    }
  }
}
