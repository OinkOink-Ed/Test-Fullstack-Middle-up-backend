import { Router } from "express";
import ItemsController from "../controllers/items.controller";

const router = Router();
const itemsController = new ItemsController();

router.get("/:id", itemsController.getItemsByID);

router.get("/", itemsController.getAllItems);

export default router;
