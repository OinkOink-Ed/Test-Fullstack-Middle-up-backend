import { Request, Response } from "express";
import { CatchControllerError } from "../decorators/CatchControllerError";
import { RequireStorage } from "../decorators/RequireStorage";
import { RequireQueryParams } from "../decorators/RequireQueryParams";

export default class ItemsController {
  @CatchControllerError
  @RequireStorage
  @RequireQueryParams(["sessionId"])
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

    const results = await req.documentStorage.getAllItems(
      sessionIdStr.trim(),
      cursor as string | null,
      search as string | undefined,
      searchInSelected === "true",
      safeLimit,
    );

    res.json(results);
  }

  @CatchControllerError
  @RequireStorage
  async createSession(req: Request, res: Response): Promise<void> {
    const sessionId = await req.documentStorage.createSession();

    res.status(201).json({
      sessionId,
      message: "Сессия создана",
    });
  }
}
