import type { StorageService } from "../services/DocumentStorage.services";
declare global {
  namespace Express {
    interface Request {
      documentStorage: StorageService;
    }
  }
}
