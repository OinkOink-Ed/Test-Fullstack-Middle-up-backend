import { Response } from "express";

export function handleError(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const res: Response = args[1];
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      console.error(
        `[${target.constructor.name}.${propertyName}] Ошибка:`,
        error,
      );
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  };
}
