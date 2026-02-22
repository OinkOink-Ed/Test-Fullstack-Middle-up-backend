import { IDocumentCollection } from "../interfaces";

interface IndexEntry {
  available: Map<string, Set<number>>;
  selected: Map<string, Set<number>>;
}

export class SearchIndex {
  private invertedIndex: Map<string, Set<number>> = new Map();
  private isBuilt = false;
  private buildPromise: Promise<void> | null = null;

  constructor(
    private availableDocuments: IDocumentCollection,
    private selectedDocuments: IDocumentCollection,
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
    console.log("🔨 Building search index...");
    this.invertedIndex.clear();

    const availableIds = this.availableDocuments.getDocumentIds();
    const selectedIds = this.selectedDocuments.getDocumentIds();

    // Index available documents
    for (let position = 0; position < availableIds.length; position++) {
      this.indexDocumentId(availableIds[position], position, false);

      if (position % 100000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    // Index selected documents
    for (let position = 0; position < selectedIds.length; position++) {
      this.indexDocumentId(selectedIds[position], position, true);
    }

    console.log(`✅ Index built: ${this.invertedIndex.size} unique keys`);
  }

  private indexDocumentId(
    documentId: string,
    position: number,
    isSelected: boolean,
  ): void {
    const normalizedId = documentId.toLowerCase();
    const collectionPrefix = isSelected ? "selected:" : "available:";

    for (let length = 2; length <= 5; length++) {
      for (let start = 0; start <= normalizedId.length - length; start++) {
        const token = normalizedId.substring(start, start + length);
        const key = collectionPrefix + token;

        if (!this.invertedIndex.has(key)) {
          this.invertedIndex.set(key, new Set());
        }
        this.invertedIndex.get(key)!.add(position);
      }
    }
  }

  search(query: string, searchInSelected: boolean): number[] {
    if (!this.isBuilt) return [];

    const collectionPrefix = searchInSelected ? "selected:" : "available:";
    const normalizedQuery = query.toLowerCase();
    const resultPositions = new Set<number>();

    const tokens = this.extractSearchTokens(normalizedQuery);

    for (const token of tokens) {
      const positions = this.invertedIndex.get(collectionPrefix + token);
      if (positions) {
        positions.forEach((pos) => resultPositions.add(pos));
      }
    }

    return Array.from(resultPositions);
  }

  private extractSearchTokens(query: string): string[] {
    const tokens = new Set<string>();

    for (let length = 2; length <= 5; length++) {
      for (let start = 0; start <= query.length - length; start++) {
        tokens.add(query.substring(start, start + length));
      }
    }

    return Array.from(tokens);
  }

  onDocumentAdded(
    documentId: string,
    position: number,
    isSelected: boolean,
  ): void {
    if (this.isBuilt) {
      this.indexDocumentId(documentId, position, isSelected);
    }
  }

  onDocumentRemoved(
    documentId: string,
    position: number,
    isSelected: boolean,
  ): void {
    if (!this.isBuilt) return;

    const collectionPrefix = isSelected ? "selected:" : "available:";
    const normalizedId = documentId.toLowerCase();

    for (const [key, positions] of this.invertedIndex.entries()) {
      if (
        key.startsWith(collectionPrefix) &&
        normalizedId.includes(key.slice(collectionPrefix.length))
      ) {
        positions.delete(position);
        if (positions.size === 0) {
          this.invertedIndex.delete(key);
        }
      }
    }
  }

  onPositionChanged(
    oldPosition: number,
    newPosition: number,
    isSelected: boolean,
  ): void {
    if (!this.isBuilt) return;

    const collectionPrefix = isSelected ? "selected:" : "available:";

    for (const [key, positions] of this.invertedIndex.entries()) {
      if (key.startsWith(collectionPrefix)) {
        if (positions.has(oldPosition)) {
          positions.delete(oldPosition);
          positions.add(newPosition);
        }
      }
    }
  }
}
