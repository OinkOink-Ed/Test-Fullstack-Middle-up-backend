import ItemsService from "../services/itemsServices";

export default class ItemsController {
  private itemsService: ItemsService;

  constructor() {
    this.itemsService = new ItemsService();
  }

  getItems() {
    return [];
  }
}
