import { Request, Response } from "express";

export function RequireQueryParams(requiredParams: string[]) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request: Request = args[0];
      const response: Response = args[1];

      for (const paramName of requiredParams) {
        const paramValue = request.query[paramName];

        if (paramValue === undefined || paramValue === null) {
          response.status(400).json({
            error: `Missing required parameter: ${paramName}`,
          });
          return;
        }

        if (typeof paramValue !== "string") {
          response.status(400).json({
            error: `Parameter ${paramName} must be a string`,
          });
          return;
        }

        const trimmedValue = paramValue.trim();

        if (trimmedValue === "") {
          response.status(400).json({
            error: `Parameter ${paramName} cannot be empty`,
          });
          return;
        }

        if (trimmedValue.length > 255) {
          response.status(400).json({
            error: `Parameter ${paramName} exceeds maximum length of 255 characters`,
          });
          return;
        }

        request.query[paramName] = trimmedValue;
      }

      return await originalMethod.apply(this, args);
    };
  };
}
