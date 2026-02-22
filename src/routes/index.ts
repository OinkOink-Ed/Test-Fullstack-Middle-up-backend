import { Router } from "express";
import itemsRouter from "./items.routes";
import sessionsRouter from "./sessions.routes";

const apiRouter = Router();

apiRouter.use("/items", itemsRouter);
apiRouter.use("/sessions", sessionsRouter);

export default apiRouter;
