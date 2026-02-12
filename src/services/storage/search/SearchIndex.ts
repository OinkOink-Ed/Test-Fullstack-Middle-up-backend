import { IItemCollection } from "../interfaces";

interface IndexEntry {
  available: Map<string, Set<number>>;
  selected: Map<string, Set<number>>;
}

export class SearchIndex {
  private index: Map<string, Set<number>> = new Map();
  private isBuilt = false;
  private buildPromise: Promise<void> | null = null;

  constructor(
    private availableCollection: IItemCollection,
    private selectedCollection: IItemCollection,
  ) {}

  async ensureBuilt(): Promise<void> {
    if (this.isBuilt) return;
    if (this.buildPromise) return this.buildPromise;

    this.buildPromise = this.build();
    await this.buildPromise;
    this.isBuilt = true;
    this.buildPromise = null;
  }

  private async build(): Promise<void> {
    console.log("Построение индекса...");
    this.index.clear();

    const availableIds = this.availableCollection.getIds();
    const selectedIds = this.selectedCollection.getIds();

    // Индексируем доступные
    for (let i = 0; i < availableIds.length; i++) {
      this.indexString(availableIds[i], i, false);

      if (i % 100000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    // Индексируем выбранные
    for (let i = 0; i < selectedIds.length; i++) {
      this.indexString(selectedIds[i], i, true);
    }

    console.log(`Индекс построен: ${this.index.size} ключей`);
  }

  private indexString(id: string, position: number, isSelected: boolean): void {
    const idLower = id.toLowerCase();
    const prefix = isSelected ? "selected:" : "available:";

    for (let len = 2; len <= 5; len++) {
      for (let start = 0; start <= idLower.length - len; start++) {
        const token = idLower.substring(start, start + len);
        const key = prefix + token;

        if (!this.index.has(key)) {
          this.index.set(key, new Set());
        }
        this.index.get(key)!.add(position);
      }
    }
  }

  search(searchTerm: string, searchInSelected: boolean): number[] {
    if (!this.isBuilt) return [];

    const prefix = searchInSelected ? "selected:" : "available:";
    const searchLower = searchTerm.toLowerCase();
    const resultSet = new Set<number>();

    // Токенизируем поисковый запрос
    const tokens = this.getSearchTokens(searchLower);

    for (const token of tokens) {
      const positions = this.index.get(prefix + token);
      if (positions) {
        positions.forEach((pos) => resultSet.add(pos));
      }
    }

    return Array.from(resultSet);
  }

  private getSearchTokens(searchTerm: string): string[] {
    const tokens = new Set<string>();

    for (let len = 2; len <= 5; len++) {
      for (let start = 0; start <= searchTerm.length - len; start++) {
        tokens.add(searchTerm.substring(start, start + len));
      }
    }

    return Array.from(tokens);
  }

  onItemAdded(id: string, position: number, isSelected: boolean): void {
    if (this.isBuilt) {
      this.indexString(id, position, isSelected);
    }
  }

  onItemRemoved(id: string, position: number, isSelected: boolean): void {
    if (!this.isBuilt) return;

    const prefix = isSelected ? "selected:" : "available:";
    const idLower = id.toLowerCase();

    for (const [key, positions] of this.index.entries()) {
      if (
        key.startsWith(prefix) &&
        idLower.includes(key.slice(prefix.length))
      ) {
        positions.delete(position);
        if (positions.size === 0) {
          this.index.delete(key);
        }
      }
    }
  }

  onPositionUpdate(
    oldPosition: number,
    newPosition: number,
    isSelected: boolean,
  ): void {
    if (!this.isBuilt) return;

    const prefix = isSelected ? "selected:" : "available:";

    for (const [key, positions] of this.index.entries()) {
      if (key.startsWith(prefix)) {
        if (positions.has(oldPosition)) {
          positions.delete(oldPosition);
          positions.add(newPosition);
        }
      }
    }
  }
}
