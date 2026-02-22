export async function processInBatches<T, R>(
  items: T[],
  processItem: (item: T) => Promise<R> | R,
  batchSize: number = 10000,
  onBatchComplete?: (processedCount: number, totalCount: number) => void,
): Promise<R[]> {
  const results: R[] = [];

  for (let offset = 0; offset < items.length; offset += batchSize) {
    const currentBatch = items.slice(offset, offset + batchSize);
    const batchResults = await Promise.all(currentBatch.map(processItem));
    results.push(...batchResults);

    if (onBatchComplete) {
      onBatchComplete(Math.min(offset + batchSize, items.length), items.length);
    }

    // GC pause to prevent memory pressure
    if (offset > 0 && offset % 500000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  return results;
}
