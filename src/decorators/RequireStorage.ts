import { Response, Request } from "express";

export function RequireStorage(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const request: Request = args[0];
    const response: Response = args[1];

    if (!request.documentStorage) {
      response.status(503).json({ error: "Storage service unavailable" });
      return;
    }

    return await originalMethod.apply(this, args);
  };
}
