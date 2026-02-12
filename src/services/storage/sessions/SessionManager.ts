import { v4 as uuidv4 } from "uuid";

export interface Session {
  searchKey: string;
  resultIds: string[];
  cursor: number;
  expiresAt: number;
  searchInSelected: boolean;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly TTL = 30 * 60 * 1000;

  constructor() {
    this.startCleanupJob();
  }

  createSessionId(): string {
    return uuidv4();
  }

  getOrCreateSession(
    sessionKey: string,
    searchKey: string,
    searchInSelected: boolean,
    resultIds: string[],
  ): Session {
    let session = this.sessions.get(sessionKey);

    if (
      session &&
      session.searchKey === searchKey &&
      session.searchInSelected === searchInSelected
    ) {
      session.expiresAt = Date.now() + this.TTL;
      return session;
    }

    session = {
      searchKey,
      resultIds,
      cursor: 0,
      expiresAt: Date.now() + this.TTL,
      searchInSelected,
    };

    this.sessions.set(sessionKey, session);
    return session;
  }

  deleteSession(sessionKey: string): void {
    this.sessions.delete(sessionKey);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(key);
      }
    }
  }

  private startCleanupJob(): void {
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  clear(): void {
    this.sessions.clear();
  }
}
