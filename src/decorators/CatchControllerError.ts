import { Response } from "express";

export function CatchControllerError(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const response: Response = args[1];
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      console.error(
        `[${target.constructor.name}.${propertyName}] Failed:`,
        error,
      );
      response.status(500).json({ error: "Internal server error" });
    }
  };
}
