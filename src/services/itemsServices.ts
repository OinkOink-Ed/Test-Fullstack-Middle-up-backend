import { storageService } from "./storage.services";

export default class ItemsService {
  async getAllItems(page: number, limit: number) {
    return storageService.getAllitems(page, limit);
  }
}
