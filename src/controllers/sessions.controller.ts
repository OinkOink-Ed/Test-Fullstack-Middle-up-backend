import { Request, Response } from "express";
import { CatchControllerError } from "../decorators/CatchControllerError";
import { RequireStorage } from "../decorators/RequireStorage";

export default class SessionsController {
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
