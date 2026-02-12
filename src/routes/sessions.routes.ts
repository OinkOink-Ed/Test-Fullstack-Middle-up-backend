import { Router } from "express";
import ItemsController from "../controllers/items.controller";

const router = Router();
const itemsController = new ItemsController();
router.get("/", itemsController.createSession);

export default router;
