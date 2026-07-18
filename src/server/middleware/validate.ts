import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  username: "Username",
  password: "Password",
  patientName: "Patient name",
  medicalNumber: "Medical number (MRN)",
  phoneNumber: "Phone number",
  doctorName: "Doctor name",
  roomNumber: "Room number",
  clinicType: "Clinic type",
  interviewType: "Interview type",
  isSatisfied: "Satisfaction status",
  recommend: "Recommendation",
  enterDate: "Entry date",
  templateId: "Template",
  text: "Question text",
  category: "Category",
  priority: "Priority",
  answers: "Answers",
  score: "Score",
  questionId: "Question",
  nameArabic: "Arabic name",
  nameEnglish: "English name",
  name: "Name",
  email: "Email",
  role: "Role",
  startDate: "Start date",
  endDate: "End date",
  search: "Search",
  page: "Page",
  limit: "Limit",
};

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
        let message = "Validation failed";
        if (first) {
          const rawField = (first.path ?? []).join(".");
          const friendlyName = FIELD_LABELS[rawField] || rawField || "Input";
          message = `${friendlyName}: ${first.message ?? "Invalid value"}`;
        }
        res.status(400).json({ error: message, details: issues });
        return;
      }
      res.status(400).json({ error: "Validation failed." });
      return;
    }
  };
}
