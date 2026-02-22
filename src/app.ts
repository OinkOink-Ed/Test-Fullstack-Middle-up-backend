import express, { Application } from "express";
import routes from "./routes";
import { Request, Response } from "express";
import { ensureStorageInitialized } from "./ensureStorageInitialized";
import { StorageSingleton } from "./services/StorageSingleton";
import helmet from "helmet";

const app: Application = express();
const port: number = Number(process.env.PORT || 3000);

// Middleware для парсинга входящих запросов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware Helmet для безопасности (устанавливает защитные HTTP-заголовки)
app.use(helmet());

app.use(async (req: Request, res: Response, next) => {
  try {
    const documentStorage = StorageSingleton.getInstance();
    req.documentStorage = documentStorage;
    next();
  } catch (error) {
    console.error("Failed to get storage service:", error);
    return res.status(500).json({ error: "Storage service unavailable" });
  }
});

app.use("/api", routes);

async function startServer() {
  try {
    await ensureStorageInitialized();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    process.exit(1); // Критическая ошибка инициализации, сервер не может работать
  }
}

startServer();
