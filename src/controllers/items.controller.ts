import { Request, Response } from "express";
import ItemsService from "../services/itemsServices";

export default class ItemsController {
  private itemsService: ItemsService;

  constructor() {
    this.itemsService = new ItemsService();
  }

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
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error,
      });
    }
  };
}
