import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { ZodError } from "zod";

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.parse(req.body);
        req.body = parsed;
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        // Replace Express query with the parsed object (typed by schema).
        (req as any).query = parsed;
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        (req as any).params = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = (err as any).issues ?? [];
        const first = issues[0];
        const message = first
          ? `${(first.path ?? []).join(".") || "value"}: ${first.message ?? "Validation failed"}`
          : "Validation failed";
        res.status(400).json({ error: message, details: issues });
        return;
      }
      res.status(400).json({ error: "Validation failed." });
      return;
    }
  };
}
