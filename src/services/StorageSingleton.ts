import { DocumentStorage } from "./DocumentStorage.service";

class StorageSingleton {
  static #instance: DocumentStorage | null = null;

  /**
   * Initializes the storage during application startup.
   * Called once in initializeStorage() before server starts.
   */
  static async getInstanceAsync(): Promise<DocumentStorage> {
    if (!this.#instance) {
      this.#instance = await this.#initializeInstance();
    }
    return this.#instance;
  }

  /**
   * Returns already initialized storage instance.
   * Used in middleware after guaranteed initialization.
   */
  static getInstance(): DocumentStorage {
    if (!this.#instance) {
      throw new Error(
        "Storage instance not created. Call getInstanceAsync() during app bootstrap.",
      );
    }
    return this.#instance;
  }

  static async #initializeInstance(): Promise<DocumentStorage> {
    if (this.#instance) {
      throw new Error("DocumentStorage is already initialized");
    }

    console.log("📦 Creating document storage instance...");
    const instance = new DocumentStorage();
    return instance;
  }
}

export { StorageSingleton };
