import { Router } from "express";
import itemsRouter from "./items.routes";
import sessionRoutes from "./sessions.routes";

const router = Router();

router.use("/items", itemsRouter);
router.use("/sessions", sessionRoutes);

export default router;
