import { Response, Request } from "express";

export function validateStorage(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const req: Request = args[0];
    const res: Response = args[1];

    if (!req.storageService) {
      res.status(500).json({ error: "Storage service недоступен" });
      return;
    }

    return await originalMethod.apply(this, args);
  };
}
