import { Item, storageService } from "./storage.services";

export default class ItemsService {
  async getItemsByID(id: number): Promise<Item | undefined> {
    return storageService.getItemsByID(id);
  }

  async getAllItems(page: number, limit: number) {
    return storageService.getAllitems(page, limit);
  }
}
