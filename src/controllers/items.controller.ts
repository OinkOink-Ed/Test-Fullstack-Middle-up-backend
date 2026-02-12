import { Request, Response } from "express";
import { handleError } from "../decorators/hadleError";
import { validateStorage } from "../decorators/validateStorage";
import { validateQueryParams } from "../decorators/validateQueryParams";

export default class ItemsController {
  @handleError
  @validateStorage
  @validateQueryParams(["sessionId"])
  async getAllItems(req: Request, res: Response): Promise<void> {
    const {
      sessionId,
      cursor,
      search,
      searchInSelected = "false",
      limit = "20",
    } = req.query;

    const sessionIdStr = sessionId as string;

    const limitNum = parseInt(limit as string, 10);
    let safeLimit = 20;

    if (!isNaN(limitNum) && limitNum > 0) {
      safeLimit = Math.min(limitNum, 20);
    }

    const results = await req.storageService.getAllItems(
      sessionIdStr.trim(),
      cursor as string | null,
      search as string | undefined,
      searchInSelected === "true",
      safeLimit,
    );

    res.json(results);
  }

  @handleError
  @validateStorage
  async createSession(req: Request, res: Response): Promise<void> {
    const sessionId = await req.storageService.createSession();

    res.status(201).json({
      sessionId,
      message: "Сессия создана",
    });
  }
}
