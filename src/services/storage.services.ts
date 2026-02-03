export interface Item {
  id: string;
  created_at: number;
  data: string;
}

export interface SelectedItem extends Item {
  selectedAt: number;
  positionId: number;
}

class StorageService {
  private entitiesIds: string[] = [];
  private entitiesMap: Map<string, Item> = new Map();

  private entitiesSelectedIds: string[] = [];
  private entitiesSelectedMap: Map<string, Item> = new Map();

  private entitiesIdToIndex = new Map<string, number>();
  private entitiesSelectedIdToIndex = new Map<string, number>();

  private nextId = 1000001;

  private activeSearches = new Map<
    string,
    {
      checkedUpTo: number;
      foundIds: string[];
      lastCursor: string | null;
    }
  >();

  constructor() {
    this.initialize();
  }

  public async initialize(): Promise<void> {
    const batchSize = 10000;
    const totalItems = 1000000;

    for (let i = 0; i < totalItems; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, totalItems - i);
      let batchIds: string[] = new Array(batchSize);
      const batch: Item[] = new Array(batchSize);

      for (let j = 0; j < currentBatchSize; j++) {
        const id = i + j + 1;
        batchIds[j] = `${id}`;
        batch[j] = {
          id: `${id}`,
          created_at:
            Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000,
          data: `Item №${id}`,
        };
      }

      batch.forEach((item, index) => {
        this.entitiesMap.set(item.id, item);
        this.entitiesIdToIndex.set(item.id, index);
      });
      this.entitiesIds.push(...batchIds);
    }
  }

  getAllitems(cursor: string | null, search?: string) {
    const limit = 20;
    const searchKey = search || "";
    let state = this.activeSearches.get(searchKey);

    if (!state) {
      state = {
        checkedUpTo: 0,
        foundIds: [],
        lastCursor: null,
      };
      this.activeSearches.set(searchKey, state);
    }

    if (cursor !== state.lastCursor) {
      state.checkedUpTo = 0;
      state.foundIds = [];
      state.lastCursor = null;
    }

    while (
      state.foundIds.length < limit &&
      state.checkedUpTo < this.entitiesIds.length
    ) {
      const id = this.entitiesIds[state.checkedUpTo];
      state.checkedUpTo++;

      if (!search || id.includes(search)) {
        state.foundIds.push(id);
      }
    }

    const resultIds = state.foundIds.splice(0, limit);

    state.lastCursor =
      resultIds.length > 0 ? resultIds[resultIds.length - 1] : null;

    if (state.checkedUpTo >= this.entitiesIds.length) {
      this.activeSearches.delete(searchKey);
    }

    return {
      items: resultIds.map((id) => this.entitiesMap.get(id)!),
      nextCursor: state.lastCursor,
      hasMore:
        state.checkedUpTo < this.entitiesIds.length ||
        state.foundIds.length > 0,
    };
  }

  choiceElement(id: string) {
    if (!this.entitiesMap.has(id)) return false;

    const item = this.entitiesMap.get(id)!;

    const itemIndex = this.entitiesIdToIndex.get(id);

    if (itemIndex === undefined) return false;

    const lastIndex = this.entitiesIds.length - 1;

    if (itemIndex < lastIndex) {
      const lastItemId = this.entitiesIds[lastIndex];

      this.entitiesIds[itemIndex] = lastItemId;
      this.entitiesIds[lastIndex] = id;
      this.entitiesIdToIndex.set(lastItemId, itemIndex);
    }

    this.entitiesIds.pop();

    this.entitiesSelectedMap.set(id, item);
    this.entitiesMap.delete(id);
    this.entitiesSelectedIds.push(id);

    this.entitiesSelectedIdToIndex.set(
      item.id,
      this.entitiesSelectedIds.length - 1,
    );

    this.entitiesIdToIndex.delete(id);
    this.activeSearches.clear();
    return true;
  }

  addElement(data: Item) {
    this.entitiesMap.set(data.id, data);
    this.entitiesIds.push(data.id);
    this.entitiesIdToIndex.set(data.id, this.entitiesIds.length - 1);
    this.activeSearches.clear();
  }
}

export const storageService = new StorageService();
