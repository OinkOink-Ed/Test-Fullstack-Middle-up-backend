import { IItem } from "./interfaces";
import { ItemCollection } from "./collections/ItemCollection";
import { SearchIndex } from "./search/SearchIndex";
import { SearchCache } from "./search/SearchCache";
import { SessionManager } from "./sessions/SessionManager";

export class StorageService {
  // Коллекции
  private availableItems = new ItemCollection();
  private selectedItems = new ItemCollection();

  // Поиск
  private searchIndex: SearchIndex;
  private searchCache = new SearchCache();

  // Сессии
  private sessionManager = new SessionManager();

  constructor() {
    this.searchIndex = new SearchIndex(this.availableItems, this.selectedItems);
  }

  // === Публичный API ===

  addElement(data: IItem): void {
    const position = this.availableItems.add(data);
    this.searchIndex.onItemAdded(data.id, position, false);
    this.searchCache.invalidate();
  }

  addElementsBatch(items: IItem[]): void {
    const positions = this.availableItems.addBatch(items);
    if (this.searchIndex["isBuilt"]) {
      items.forEach((item, idx) => {
        this.searchIndex.onItemAdded(item.id, positions[idx], false);
      });
    }
    this.searchCache.invalidate();
  }

  choiceElement(id: string): boolean {
    const item = this.availableItems.remove(id);
    if (!item) return false;

    const position = this.selectedItems.add(item);
    this.searchIndex.onItemAdded(id, position, true);
    this.searchCache.invalidate();

    return true;
  }

  async initialize(): Promise<void> {
    await this.searchIndex.ensureBuilt();
    console.log("StorageService инициализирован");
  }

  async getAllItems(
    sessionId: string,
    cursor?: string | null,
    search?: string,
    searchInSelected: boolean = false,
    limit: number = 20,
  ): Promise<{
    items: IItem[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }> {
    await this.searchIndex.ensureBuilt();

    const collection = searchInSelected
      ? this.selectedItems
      : this.availableItems;
    const searchKey = search || "";
    const sessionKey = `${sessionId}:${searchKey}:${searchInSelected}`;

    // Получаем ID через поиск или весь список
    let resultIds: string[];
    let totalCount: number;

    if (searchKey) {
      // Проверяем кэш
      const cacheKey = `${searchKey}:${searchInSelected}`;
      const cached = this.searchCache.get(cacheKey);

      if (cached) {
        resultIds = cached;
      } else {
        const positions = this.searchIndex.search(searchKey, searchInSelected);
        resultIds = positions
          .map((pos) => collection.getIds()[pos])
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        this.searchCache.set(cacheKey, resultIds);
      }
      totalCount = resultIds.length;
    } else {
      resultIds = collection.getIds();
      totalCount = resultIds.length;
    }

    // Управление сессией
    const session = this.sessionManager.getOrCreateSession(
      sessionKey,
      searchKey,
      searchInSelected,
      resultIds,
    );

    // Позиционирование курсора
    if (cursor) {
      const cursorIndex = session.resultIds.indexOf(cursor);
      if (cursorIndex !== -1) {
        session.cursor = cursorIndex + 1;
      }
    }

    // Получение пачки
    const pageIds = session.resultIds.slice(
      session.cursor,
      session.cursor + limit,
    );

    session.cursor += pageIds.length;
    const hasMore = session.cursor < session.resultIds.length;

    if (!hasMore) {
      this.sessionManager.deleteSession(sessionKey);
    }

    const items = this.getItemsByIds(pageIds, searchInSelected);

    return {
      items,
      nextCursor: pageIds.length > 0 ? pageIds[pageIds.length - 1] : null,
      hasMore,
      totalCount,
    };
  }

  private getItemsByIds(ids: string[], fromSelected: boolean): IItem[] {
    const collection = fromSelected ? this.selectedItems : this.availableItems;
    return ids.map((id) => collection.getItem(id)).filter(Boolean) as IItem[];
  }

  async createSession(): Promise<string> {
    return this.sessionManager.createSessionId();
  }

  deleteSession(sessionId: string): void {
    // Удаление сессии по префиксу
    for (const key of this.sessionManager["sessions"].keys()) {
      if (key.startsWith(sessionId)) {
        this.sessionManager.deleteSession(key);
      }
    }
  }
}
