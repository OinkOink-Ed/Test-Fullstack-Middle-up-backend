import { Router } from "express";
import itemsRouter from "./items.routes";

const router = Router();

router.use("/items", itemsRouter);

export default router;
