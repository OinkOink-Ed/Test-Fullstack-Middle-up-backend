import type { StorageService } from "../services/storage.services";
declare global {
  namespace Express {
    interface Request {
      storageService: StorageService;
    }
  }
}
