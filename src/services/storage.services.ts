export interface Item {
  id: number;
  created_at: number;
  data: string;
}

export interface SelectedItem extends Item {
  selectedAt: number;
  positionId: number;
}

class StorageService {
  private entitiesIds: number[] = [];
  private entitiesMap: Map<number, Item> = new Map();

  private nextId = 1000001;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const batchSize = 10000;
    const totalItems = 1000000;

    for (let i = 0; i < totalItems; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, totalItems - i);
      let batchIds: number[] = new Array(batchSize);
      const batch: Item[] = new Array(batchSize);

      for (let j = 0; j < currentBatchSize; j++) {
        const id = i + j + 1;
        batchIds[j] = id;
        batch[j] = {
          id: id,
          created_at:
            Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000,
          data: `Item №${id}`,
        };
      }

      batch.forEach((item) => {
        this.entitiesMap.set(item.id, item);
      });
      this.entitiesIds.push(...batchIds);
    }
  }

  getItems(page: number, limit: number, search?: string) {
    return [];
  }
}

export const storageService = new StorageService();
