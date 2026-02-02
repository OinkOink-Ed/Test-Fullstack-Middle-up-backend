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

  public async initialize(): Promise<void> {
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

  getItemsByID(id: number): Item | undefined {
    return this.entitiesMap.get(id);
  }

  getAllitems(page: number, limit: number) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const idsArray = this.entitiesIds.slice(startIndex, endIndex);

    const result = idsArray.flatMap((id) => {
      const item = this.entitiesMap.get(id);
      return item ? [item] : [];
    });

    return result;
  }
}

export const storageService = new StorageService();
