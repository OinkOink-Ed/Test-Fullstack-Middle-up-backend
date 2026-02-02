import { Request, response, Response } from "express";
import ItemsService from "../services/itemsServices";

export default class ItemsController {
  private itemsService: ItemsService;

  constructor() {
    this.itemsService = new ItemsService();
  }

  getItemsByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Параметр поиска не был передан",
        });
      }

      const numericId = parseInt(id as string);
      if (isNaN(numericId)) {
        return res.status(400).json({
          success: false,
          error: "Параметр должен быть числом",
        });
      }

      const item = await this.itemsService.getItemsByID(numericId);
      if (!item) {
        return res.status(200).json({
          success: true,
          data: null,
        });
      }

      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Ошибка Сервера",
      });
    }
  };

  getAllItems = async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (isNaN(pageNum) || isNaN(limitNum)) {
        return res.status(400).json({
          success: false,
          error: "Параметры должны быть числами",
        });
      }

      const result = await this.itemsService.getAllItems(pageNum, limitNum);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {}
  };
}
