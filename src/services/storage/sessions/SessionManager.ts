import { v4 as uuidv4 } from "uuid";

export interface SearchSnapshot {
  query: string;
  resultIdentifiers: string[];
  currentPosition: number;
  expiresAt: number;
  searchWithinResults: boolean;
}

export interface SessionMetadata {
  expiresAt: number;
  activeSearchKeys: Set<string>;
}

export class SessionManager {
  private searchStorage: Map<string, SearchSnapshot> = new Map();
  private sessionRegistry: Map<string, SessionMetadata> = new Map();

  private readonly SEARCH_LIFETIME = 5 * 60 * 1000;
  private readonly SESSION_LIFETIME = 30 * 60 * 1000;

  constructor() {
    this.#startGarbageCollection();
  }

  retrieveOrCreateSearch(
    sessionToken: string | undefined,
    searchQuery: string,
    restrictToSelected: boolean,
    foundIdentifiers: string[],
  ): { search: SearchSnapshot; sessionToken: string } {
    const effectiveToken = sessionToken || uuidv4();

    let session = this.sessionRegistry.get(effectiveToken);
    const now = Date.now();

    if (!session || session.expiresAt < now) {
      session = {
        expiresAt: now + this.SESSION_LIFETIME,
        activeSearchKeys: new Set(),
      };
      this.sessionRegistry.set(effectiveToken, session);
    }

    const searchIdentifier = `${effectiveToken}|${searchQuery}`;
    let existingSearch = this.searchStorage.get(searchIdentifier);

    if (
      existingSearch &&
      existingSearch.query === searchQuery &&
      existingSearch.searchWithinResults === restrictToSelected
    ) {
      existingSearch.expiresAt = now + this.SEARCH_LIFETIME;
      return {
        search: existingSearch,
        sessionToken: effectiveToken,
      };
    }

    const freshSearch: SearchSnapshot = {
      query: searchQuery,
      resultIdentifiers: foundIdentifiers,
      currentPosition: 0,
      expiresAt: now + this.SEARCH_LIFETIME,
      searchWithinResults: restrictToSelected,
    };

    this.searchStorage.set(searchIdentifier, freshSearch);
    session.activeSearchKeys.add(searchIdentifier);

    return {
      search: freshSearch,
      sessionToken: effectiveToken,
    };
  }

  #purgeSessionSearches(sessionToken: string): void {
    const session = this.sessionRegistry.get(sessionToken);
    if (session) {
      for (const searchKey of session.activeSearchKeys) {
        this.searchStorage.delete(searchKey);
      }
      this.sessionRegistry.delete(sessionToken);
    }
  }

  #purgeExpiredSearches(): void {
    const now = Date.now();
    for (const [searchId, snapshot] of this.searchStorage.entries()) {
      if (snapshot.expiresAt < now) {
        const sessionToken = searchId.split("|")[0];
        const parentSession = this.sessionRegistry.get(sessionToken);
        if (parentSession) {
          parentSession.activeSearchKeys.delete(searchId);
        }
        this.searchStorage.delete(searchId);
      }
    }
  }

  #purgeExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionToken, metadata] of this.sessionRegistry.entries()) {
      if (metadata.expiresAt < now) {
        this.#purgeSessionSearches(sessionToken);
      }
    }
  }

  #startGarbageCollection(): void {
    setInterval(() => this.#purgeExpiredSearches(), 5 * 60 * 1000);
    setInterval(() => this.#purgeExpiredSessions(), 30 * 60 * 1000);
  }
}
