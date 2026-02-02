import express, { Application } from "express";
import routes from "./routes";
import { storageService } from "./services/storage.services";

const app: Application = express();
const port: number = 3000;

app.use("/api", routes);

async function startServer() {
  try {
    await storageService.initialize();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    process.exit(1);
  }
}

startServer();

export default app;
