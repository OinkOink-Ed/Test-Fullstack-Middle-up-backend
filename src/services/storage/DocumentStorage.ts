import { IDocument } from "./interfaces";
import { DocumentCollection } from "./collections/DocumentCollection";
import { SearchIndex } from "./search/SearchIndex";
import { SearchCache } from "./search/SearchCache";
import { SessionManager } from "./sessions/SessionManager";

export class DocumentStorage {
  // Collections
  #availableDocuments = new DocumentCollection();
  #selectedDocuments = new DocumentCollection();

  // Search
  #searchIndex: SearchIndex;
  #searchCache = new SearchCache();

  // Sessions
  private sessionManager = new SessionManager();

  constructor() {
    this.#searchIndex = new SearchIndex(
      this.#availableDocuments,
      this.#selectedDocuments,
    );
  }

  // === Public API ===

  addDocument(document: IDocument): void {
    const position = this.#availableDocuments.add(document);
    this.#searchIndex.onDocumentAdded(document.id, position, false);
    this.#searchCache.invalidate();
  }

  addDocumentsBatch(documents: IDocument[]): void {
    const positions = this.#availableDocuments.addBatch(documents);
    if (this.#searchIndex["isBuilt"]) {
      documents.forEach((document, index) => {
        this.#searchIndex.onDocumentAdded(document.id, positions[index], false);
      });
    }
    this.#searchCache.invalidate();
  }

  selectDocument(documentId: string): boolean {
    const document = this.#availableDocuments.remove(documentId);
    if (!document) return false;

    const position = this.#selectedDocuments.add(document);
    this.#searchIndex.onDocumentAdded(documentId, position, true);
    this.#searchCache.invalidate();

    return true;
  }

  async initialize(): Promise<void> {
    await this.#searchIndex.ensureBuilt();
    console.log("DocumentStorage initialized");
  }

  async getDocuments(
    sessionId: string,
    cursor?: string | null,
    searchQuery?: string,
    searchInSelected: boolean = false,
    pageSize: number = 20,
  ): Promise<{
    documents: IDocument[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }> {
    await this.#searchIndex.ensureBuilt();

    const collection = searchInSelected
      ? this.#selectedDocuments
      : this.#availableDocuments;
    const normalizedQuery = searchQuery || "";
    const sessionKey = `${sessionId}:${normalizedQuery}:${searchInSelected}`;

    // Get document IDs via search or full list
    let resultDocumentIds: string[];
    let totalCount: number;

    if (normalizedQuery) {
      // Check cache
      const cacheKey = `${normalizedQuery}:${searchInSelected}`;
      const cached = this.#searchCache.get(cacheKey);

      if (cached) {
        resultDocumentIds = cached;
      } else {
        const positions = this.#searchIndex.search(
          normalizedQuery,
          searchInSelected,
        );
        resultDocumentIds = positions
          .map((pos) => collection.getDocumentIds()[pos])
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        this.#searchCache.set(cacheKey, resultDocumentIds);
      }
      totalCount = resultDocumentIds.length;
    } else {
      resultDocumentIds = collection.getDocumentIds();
      totalCount = resultDocumentIds.length;
    }

    // Session management
    const session = this.sessionManager.retrieveOrCreateSearch(
      sessionKey,
      normalizedQuery,
      searchInSelected,
      resultDocumentIds,
    );

    // Cursor positioning
    if (cursor) {
      const cursorIndex = session.search.resultIdentifiers.indexOf(cursor);
      if (cursorIndex !== -1) {
        session.search.currentPosition = cursorIndex + 1;
      }
    }

    // Get page
    const pageDocumentIds = session.search.resultIdentifiers.slice(
      session.search.currentPosition,
      session.search.currentPosition + pageSize,
    );

    session.search.currentPosition += pageDocumentIds.length;
    const hasMore =
      session.search.currentPosition < session.search.resultIdentifiers.length;

    const documents = this.#getDocumentsByIds(
      pageDocumentIds,
      searchInSelected,
    );

    return {
      documents,
      nextCursor:
        pageDocumentIds.length > 0
          ? pageDocumentIds[pageDocumentIds.length - 1]
          : null,
      hasMore,
      totalCount,
    };
  }

  #getDocumentsByIds(
    documentIds: string[],
    fromSelected: boolean,
  ): IDocument[] {
    const collection = fromSelected
      ? this.#selectedDocuments
      : this.#availableDocuments;
    return documentIds
      .map((id) => collection.getDocument(id))
      .filter(Boolean) as IDocument[];
  }
}
