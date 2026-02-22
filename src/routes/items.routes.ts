import { Router } from "express";
import ItemsController from "../controllers/items.controller";

const itemsRouter = Router();
const itemsController = new ItemsController();

itemsRouter.get("/", itemsController.getAllItems);

export default itemsRouter;
