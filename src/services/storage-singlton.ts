import { StorageService } from "./storage.services";

class StorageSingleton {
  static #instance: StorageService | null = null;

  /**
   * Инициализация хранилища при старте приложения.
   * Вызывается Один раз в initializeStorage() до запуска сервера.
   */
  static async getInstanceAsync(): Promise<StorageService> {
    if (!this.#instance) {
      this.#instance = await this.#initializeInstance();
    }
    return this.#instance;
  }

  /**
   * Получение уже инициализированного экземпляра.
   * Используется в middleware после гарантированной инициализации.
   */
  static getInstance(): StorageService {
    if (!this.#instance) {
      throw new Error(
        "Экзмепляр хранилища не был создан, при старте приложения не был вызван метод initializeInstance()",
      );
    }
    return this.#instance;
  }

  static async #initializeInstance(): Promise<StorageService> {
    if (this.#instance) {
      throw new Error("StorageService is already initialized");
    }

    console.log("Creating storage service instance...");
    const instance = new StorageService();
    return instance;
  }
}

export { StorageSingleton };
