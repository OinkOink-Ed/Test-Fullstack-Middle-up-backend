import { v4 as uuidv4 } from "uuid";

interface Item {
  id: string;
  // другие поля
}

export class StorageService {
  // === Ваши основные коллекции ===
  private entitiesIds: string[] = []; // Все доступные ID
  private entitiesMap: Map<string, Item> = new Map(); // Все доступные элементы

  private entitiesSelectedIds: string[] = []; // Выбранные ID
  private entitiesSelectedMap: Map<string, Item> = new Map(); // Выбранные элементы

  // === Ваши индексы для быстрого доступа ===
  private entitiesIdToIndex = new Map<string, number>(); // Позиция в entitiesIds
  private entitiesSelectedIdToIndex = new Map<string, number>(); // Позиция в selected

  // === Мои оптимизации для поиска ===
  private searchIndex: Map<string, Set<number>> = new Map(); // Улучшенный индекс: Set вместо массива
  private searchCache: Map<string, { ids: string[]; timestamp: number }> =
    new Map();
  private cacheAccessOrder: string[] = [];

  private readonly CACHE_MAX_SIZE = 1000;
  private readonly CACHE_TTL = 10 * 60 * 1000;

  // === Сессии ===
  private userSessions: Map<
    string,
    {
      searchKey: string;
      resultIds: string[];
      cursor: number;
      expiresAt: number;
      searchInSelected: boolean;
    }
  > = new Map();

  private readonly SESSION_TTL = 30 * 60 * 1000;

  // === Флаг инициализации ===
  private isIndexBuilt: boolean = false;
  private indexBuildPromise: Promise<void> | null = null;

  // === Ваш метод addElement (немного модифицированный) ===

  /**
   * Добавление элемента в доступные
   * Этот метод вы уже используете для заполнения миллиона элементов
   */
  addElement(data: Item): void {
    // 1. Добавляем в ваши основные структуры
    const newIndex = this.entitiesIds.length;
    this.entitiesIds.push(data.id);
    this.entitiesMap.set(data.id, data);
    this.entitiesIdToIndex.set(data.id, newIndex);

    // 2. Если индекс уже построен, добавляем элемент в индекс
    if (this.isIndexBuilt) {
      this.indexString(data.id, newIndex, false);
    }

    // 3. Инвалидируем кэш поиска
    this.invalidateSearchCache();
  }

  /**
   * Инициализация сервиса (можно вызывать после добавления всех элементов)
   * ИЛИ использовать ленивую инициализацию индекса
   */
  async initialize(): Promise<void> {
    if (this.isIndexBuilt) {
      return Promise.resolve();
    }

    // Запускаем и ждем
    return this.buildSearchIndex().then(() => {
      this.isIndexBuilt = true;
      this.startCleanupJob();
      console.log("Индекс успешно построен!");
    });
  }

  /**
   * Ленивое построение индекса (при первом поиске)
   */
  private ensureIndexBuilt(): Promise<void> {
    if (this.isIndexBuilt) {
      return Promise.resolve();
    }

    if (this.indexBuildPromise) {
      return this.indexBuildPromise;
    }

    this.indexBuildPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log(
          `Начинаем построение индекса для ${this.entitiesIds.length} элементов...`,
        );
        console.time("buildSearchIndex");

        this.buildSearchIndex();
        this.isIndexBuilt = true;
        this.indexBuildPromise = null;

        console.timeEnd("buildSearchIndex");
        console.log(`Построен индекс с ${this.searchIndex.size} ключами`);
        resolve();
      }, 0);
    });

    return this.indexBuildPromise;
  }

  /**
   * Построение поискового индекса (выполняется один раз)
   */
  private async buildSearchIndex(): Promise<void> {
    console.log("Начинаем построение поискового индекса...");
    console.time("buildSearchIndex");

    this.searchIndex.clear();

    const totalElements =
      this.entitiesIds.length + this.entitiesSelectedIds.length;
    let processed = 0;
    const reportInterval = Math.max(1, Math.floor(totalElements / 10));

    // Индексируем доступные элементы
    for (let i = 0; i < this.entitiesIds.length; i++) {
      const id = this.entitiesIds[i];
      this.indexString(id, i, false);

      processed++;
      if (processed % reportInterval === 0) {
        const percent = Math.round((processed / totalElements) * 100);
        console.log(`Прогресс: ${percent}% (${processed}/${totalElements})`);

        // Даем event loop передохнуть
        if (processed % 100000 === 0) {
          await new Promise((resolve) => setImmediate(resolve));
        }
      }
    }

    // Индексируем выбранные элементы (если есть)
    for (let i = 0; i < this.entitiesSelectedIds.length; i++) {
      const id = this.entitiesSelectedIds[i];
      this.indexString(id, i, true);
      processed++;
    }

    console.timeEnd("buildSearchIndex");
    console.log(
      `Построен индекс с ${this.searchIndex.size.toLocaleString()} ключами`,
    );
  }

  /**
   * Альтернатива: инкрементальное построение индекса (медленнее, но не блокирует)
   */
  private buildSearchIndexLazy(): void {
    this.searchIndex.clear();
    this.isIndexBuilt = true;

    // Можно запускать в фоновом режиме
    setTimeout(() => {
      console.log("Фоновое построение индекса...");
      this.buildSearchIndex();
    }, 100);
  }

  // === Ваш метод choiceElement (адаптированный) ===

  /**
   * Выбор элемента (перемещение из доступных в выбранные)
   */
  choiceElement(id: string): boolean {
    if (!this.entitiesMap.has(id)) return false;

    const item = this.entitiesMap.get(id)!;
    const itemIndex = this.entitiesIdToIndex.get(id);

    if (itemIndex === undefined) return false;

    // 1. Обновляем поисковый индекс
    if (this.isIndexBuilt) {
      // Удаляем из индекса доступных
      this.removeFromSearchIndex(id, itemIndex, false);
    }

    // 2. Ваш оригинальный код для удаления из доступных
    const lastIndex = this.entitiesIds.length - 1;

    if (itemIndex < lastIndex) {
      const lastItemId = this.entitiesIds[lastIndex];

      this.entitiesIds[itemIndex] = lastItemId;
      this.entitiesIds[lastIndex] = id;
      this.entitiesIdToIndex.set(lastItemId, itemIndex);
    }

    this.entitiesIds.pop();
    this.entitiesMap.delete(id);
    this.entitiesIdToIndex.delete(id);

    // 3. Добавляем в выбранные
    const newSelectedIndex = this.entitiesSelectedIds.length;
    this.entitiesSelectedIds.push(id);
    this.entitiesSelectedMap.set(id, item);
    this.entitiesSelectedIdToIndex.set(id, newSelectedIndex);

    // 4. Обновляем поисковый индекс
    if (this.isIndexBuilt) {
      // Добавляем в индекс выбранных
      this.indexString(id, newSelectedIndex, true);

      // Обновляем позиции в индексе для сдвинутых элементов
      this.updateIndexPositionsAfterRemoval(itemIndex, false);
    }

    // 5. Инвалидируем кэш поиска
    this.invalidateSearchCache();

    return true;
  }

  // === Основной метод поиска с пагинацией ===

  /**
   * Получение элементов с поиском
   */
  async getAllItems(
    sessionId: string,
    cursor?: string | null,
    search?: string,
    searchInSelected: boolean = false,
    limit: number = 20,
  ): Promise<{
    items: Item[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }> {
    // Убеждаемся, что индекс построен
    await this.ensureIndexBuilt();

    const searchKey = search || "";
    const sessionKey = `${sessionId}:${searchKey}:${searchInSelected}`;

    // Получаем или создаем сессию
    const session = await this.getOrCreateSession(
      sessionKey,
      searchKey,
      searchInSelected,
    );

    // Обновляем TTL
    session.expiresAt = Date.now() + this.SESSION_TTL;

    // Позиционируем курсор
    if (cursor) {
      const cursorIndex = session.resultIds.indexOf(cursor);
      if (cursorIndex !== -1) {
        session.cursor = cursorIndex + 1;
      }
    }

    // Получаем данные
    const resultIds = session.resultIds.slice(
      session.cursor,
      session.cursor + limit,
    );

    const itemsCount = resultIds.length;
    session.cursor += itemsCount;

    const hasMore = session.cursor < session.resultIds.length;

    // Очищаем завершенные сессии
    if (!hasMore) {
      this.userSessions.delete(sessionKey);
    }

    // Получаем объекты
    const items = this.getItemsByIds(resultIds, searchInSelected);

    return {
      items,
      nextCursor: itemsCount > 0 ? resultIds[itemsCount - 1] : null,
      hasMore,
      totalCount: session.resultIds.length,
    };
  }

  private async getOrCreateSession(
    sessionKey: string,
    searchKey: string,
    searchInSelected: boolean,
  ) {
    let session = this.userSessions.get(sessionKey);

    if (
      session &&
      session.searchKey === searchKey &&
      session.searchInSelected === searchInSelected
    ) {
      return session;
    }

    // Получаем результаты поиска
    const sourceIds = searchInSelected
      ? this.entitiesSelectedIds
      : this.entitiesIds;
    const resultIds = searchKey
      ? await this.searchWithIndex(searchKey, sourceIds, searchInSelected)
      : sourceIds;

    session = {
      searchKey,
      resultIds,
      cursor: 0,
      expiresAt: Date.now() + this.SESSION_TTL,
      searchInSelected,
    };

    this.userSessions.set(sessionKey, session);
    return session;
  }

  /**
   * Поиск по вхождению с использованием индекса
   */
  private async searchWithIndex(
    searchTerm: string,
    sourceIds: string[],
    searchInSelected: boolean,
  ): Promise<string[]> {
    const cacheKey = `${searchTerm}:${searchInSelected}`;

    // Проверяем кэш
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const searchTermLower = searchTerm.toLowerCase();
    const keyPrefix = searchInSelected ? "selected:" : "available:";

    // Используем Set для устранения дубликатов
    const resultIndices = new Set<number>();

    // Стратегия поиска в зависимости от длины запроса
    if (searchTermLower.length < 2) {
      // Для очень коротких запросов - линейный поиск
      for (let i = 0; i < sourceIds.length; i++) {
        if (sourceIds[i].toLowerCase().includes(searchTermLower)) {
          resultIndices.add(i);
        }
      }
    } else {
      // Для запросов от 2 символов используем индекс
      // Разбиваем поисковый запрос на токены
      const tokens = this.getSearchTokens(searchTermLower);

      for (const token of tokens) {
        const indexKey = keyPrefix + token;
        const indices = this.searchIndex.get(indexKey);

        if (indices) {
          // Добавляем все индексы из этого токена
          indices.forEach((idx) => {
            // Проверяем, что индекс в пределах массива
            if (idx < sourceIds.length) {
              resultIndices.add(idx);
            }
          });
        }
      }

      // Фильтруем результаты (проверяем полное вхождение)
      const filteredIndices = Array.from(resultIndices).filter((idx) => {
        const id = sourceIds[idx];
        return id && id.toLowerCase().includes(searchTermLower);
      });

      resultIndices.clear();
      filteredIndices.forEach((idx) => resultIndices.add(idx));
    }

    // Преобразуем индексы в ID и сортируем
    const resultIds = Array.from(resultIndices)
      .map((idx) => sourceIds[idx])
      .filter((id) => id !== undefined) // На всякий случай
      .sort((a, b) => a.localeCompare(b));

    // Кэшируем
    this.saveToCache(cacheKey, resultIds);

    return resultIds;
  }

  /**
   * Разбивает строку поиска на токены для индекса
   */
  private getSearchTokens(searchTerm: string): string[] {
    const tokens = new Set<string>();
    const minTokenLength = 2;
    const maxTokenLength = 5;

    // Добавляем полный термин
    if (searchTerm.length >= minTokenLength) {
      tokens.add(
        searchTerm.substring(0, Math.min(searchTerm.length, maxTokenLength)),
      );
    }

    // Добавляем подстроки
    for (let start = 0; start < searchTerm.length; start++) {
      for (let length = minTokenLength; length <= maxTokenLength; length++) {
        if (start + length > searchTerm.length) break;
        tokens.add(searchTerm.substring(start, start + length));
      }
    }

    return Array.from(tokens);
  }

  // === Вспомогательные методы для работы с индексом ===

  /**
   * Индексация строки
   */
  private indexString(id: string, position: number, isSelected: boolean): void {
    const idLower = id.toLowerCase();
    const keyPrefix = isSelected ? "selected:" : "available:";

    // Индексируем все подстроки длиной от 2 до 5 символов
    const minLength = 2;
    const maxLength = 5;

    for (let start = 0; start < idLower.length; start++) {
      for (let length = minLength; length <= maxLength; length++) {
        if (start + length > idLower.length) break;

        const token = idLower.substring(start, start + length);
        const indexKey = keyPrefix + token;

        if (!this.searchIndex.has(indexKey)) {
          this.searchIndex.set(indexKey, new Set());
        }

        this.searchIndex.get(indexKey)!.add(position);
      }
    }
  }

  /**
   * Удаление из индекса
   */
  private removeFromSearchIndex(
    id: string,
    position: number,
    isSelected: boolean,
  ): void {
    const idLower = id.toLowerCase();
    const keyPrefix = isSelected ? "selected:" : "available:";

    // Удаляем все токены для этой позиции
    for (const [key, positions] of this.searchIndex.entries()) {
      if (key.startsWith(keyPrefix)) {
        positions.delete(position);

        // Если Set пустой, удаляем ключ
        if (positions.size === 0) {
          this.searchIndex.delete(key);
        }
      }
    }
  }

  /**
   * Обновление позиций в индексе после удаления элемента
   */
  private updateIndexPositionsAfterRemoval(
    removedIndex: number,
    isSelected: boolean,
  ): void {
    const keyPrefix = isSelected ? "selected:" : "available:";

    for (const [key, positions] of this.searchIndex.entries()) {
      if (key.startsWith(keyPrefix)) {
        const newPositions = new Set<number>();

        positions.forEach((pos) => {
          if (pos > removedIndex) {
            // Сдвигаем позицию
            newPositions.add(pos - 1);
          } else if (pos !== removedIndex) {
            // Оставляем как есть
            newPositions.add(pos);
          }
        });

        this.searchIndex.set(key, newPositions);
      }
    }
  }

  // === Остальные методы (без изменений) ===

  private getItemsByIds(ids: string[], fromSelected: boolean): Item[] {
    const sourceMap = fromSelected
      ? this.entitiesSelectedMap
      : this.entitiesMap;
    return ids.map((id) => sourceMap.get(id)!).filter(Boolean);
  }

  private invalidateSearchCache(): void {
    this.searchCache.clear();
    this.cacheAccessOrder = [];
    this.userSessions.clear();
  }

  private getFromCache(key: string): string[] | null {
    const entry = this.searchCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.searchCache.delete(key);
      this.cacheAccessOrder = this.cacheAccessOrder.filter((k) => k !== key);
      return null;
    }

    // Обновляем LRU
    this.cacheAccessOrder = this.cacheAccessOrder.filter((k) => k !== key);
    this.cacheAccessOrder.push(key);

    return entry.ids;
  }

  private saveToCache(key: string, ids: string[]): void {
    if (this.searchCache.size >= this.CACHE_MAX_SIZE) {
      const oldestKey = this.cacheAccessOrder.shift();
      if (oldestKey) this.searchCache.delete(oldestKey);
    }

    this.searchCache.set(key, {
      ids,
      timestamp: Date.now(),
    });

    this.cacheAccessOrder.push(key);
  }

  private startCleanupJob(): void {
    setInterval(
      () => {
        this.cleanupExpiredSessions();
        this.cleanupExpiredCache();
      },
      5 * 60 * 1000,
    );
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.userSessions.entries()) {
      if (session.expiresAt < now) {
        this.userSessions.delete(key);
      }
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.searchCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.searchCache.delete(key);
        this.cacheAccessOrder = this.cacheAccessOrder.filter((k) => k !== key);
      }
    }
  }

  // === Публичные методы ===

  async createSession(): Promise<string> {
    return uuidv4();
  }

  /**
   * Метод для пакетного добавления элементов
   * (если вы заполняете миллион элементов)
   */
  addElementsBatch(items: Item[]): void {
    console.time("addElementsBatch");

    // 1. Добавляем в основные структуры
    items.forEach((item, index) => {
      const globalIndex = this.entitiesIds.length + index;
      this.entitiesIds.push(item.id);
      this.entitiesMap.set(item.id, item);
      this.entitiesIdToIndex.set(item.id, globalIndex);
    });

    // 2. Если индекс уже построен, добавляем пакетно
    if (this.isIndexBuilt) {
      const startIndex = this.entitiesIds.length - items.length;
      items.forEach((item, relativeIndex) => {
        const globalIndex = startIndex + relativeIndex;
        this.indexString(item.id, globalIndex, false);
      });
    }

    // 3. Инвалидируем кэш
    this.invalidateSearchCache();

    console.timeEnd("addElementsBatch");
    console.log(
      `Добавлено ${items.length} элементов, всего: ${this.entitiesIds.length}`,
    );
  }
}
