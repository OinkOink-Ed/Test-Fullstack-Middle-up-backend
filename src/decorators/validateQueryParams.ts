import { Request, Response } from "express";

export function validateQueryParams(requiredParams: string[]) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req: Request = args[0];
      const res: Response = args[1];

      for (const param of requiredParams) {
        const value = req.query[param];

        if (value === undefined || value === null) {
          res.status(400).json({
            error: `Параметр ${param} обязателен`,
          });
          return;
        }

        if (typeof value !== "string") {
          res.status(400).json({
            error: `Параметр ${param} должен быть строкой`,
          });
          return;
        }

        if (value.trim() === "") {
          res.status(400).json({
            error: `Параметр ${param} не может быть пустым`,
          });
          return;
        }

        if (value.length > 255) {
          res.status(400).json({
            error: `Параметр ${param} слишком длинный`,
          });
          return;
        }
        req.query[param] = value.trim();
      }
      return await originalMethod.apply(this, args);
    };
  };
}
