import { storageService } from "./storage.services";

export default class ItemsService {
  async getItems(page: number, limit: number, search?: string) {
    return storageService.getItems(page, limit, search);
  }
}
