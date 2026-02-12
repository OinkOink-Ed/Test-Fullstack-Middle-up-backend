export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  batchSize: number = 10000,
  onProgress?: (processed: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }

    // GC пауза
    if (i > 0 && i % 500000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  return results;
}
