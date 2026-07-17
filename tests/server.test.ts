import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pg from "pg";

import { apiRouter } from "../src/server/routes";
import { pool } from "../src/server/db/pool";
import { hashPassword } from "../src/server/utils/db";
import fs from "fs";
import path from "path";

// Apply schema before all tests
const SCHEMA_PATH = path.resolve(__dirname, "../src/server/db/schema.sql");

beforeAll(async () => {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  await pool.query(schema);
});

// Clean all tables between tests
beforeEach(async () => {
  await pool.query("DELETE FROM answers");
  await pool.query("DELETE FROM whatsapp_logs");
  await pool.query("DELETE FROM surveys");
  await pool.query("DELETE FROM questions");
  await pool.query("DELETE FROM categories");
  await pool.query("DELETE FROM templates");
  await pool.query("DELETE FROM users");

  // Reset sequences
  await pool.query("SELECT setval('users_id_seq', 0, false)");
  await pool.query("SELECT setval('templates_id_seq', 0, false)");
  await pool.query("SELECT setval('categories_id_seq', 0, false)");
  await pool.query("SELECT setval('questions_id_seq', 0, false)");
  await pool.query("SELECT setval('surveys_id_seq', 0, false)");
  await pool.query("SELECT setval('answers_id_seq', 0, false)");

  // Seed test data
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO users (id, name, username, password, role, created_at) VALUES
     (1, 'Admin', 'admin', $1, 'Admin', $2),
     (2, 'Manager', 'manager', $3, 'Manager', $2),
     (3, 'Agent', 'agent', $4, 'Agent', $2)`,
    [hashPassword("admin123"), now, hashPassword("manager123"), hashPassword("agent123")],
  );

  await pool.query(
    `INSERT INTO templates (id, title, is_active, created_at) VALUES (1, 'In-Patient', true, $1)`,
    [now],
  );

  await pool.query(
    `INSERT INTO categories (id, name_english, name_arabic) VALUES (1, 'Medical', 'طبي')`,
  );

  await pool.query(
    `INSERT INTO questions (id, template_id, text, category, priority, created_at)
     VALUES (1, 1, 'السؤال 1', 'Medical', 'High', $1)`,
    [now],
  );

  // Reset sequences after explicit inserts
  await pool.query("SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1))");
  await pool.query("SELECT setval('templates_id_seq', GREATEST((SELECT MAX(id) FROM templates), 1))");
  await pool.query("SELECT setval('categories_id_seq', GREATEST((SELECT MAX(id) FROM categories), 1))");
  await pool.query("SELECT setval('questions_id_seq', GREATEST((SELECT MAX(id) FROM questions), 1))");
});

afterAll(async () => {
  await pool.end();
});

function createTestApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(rateLimit({ windowMs: 60_000, limit: 500 }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", apiRouter);
  app.use((_err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ error: "Internal error" });
  });
  return app;
}

let app: express.Application;
let tokenAdmin: string;
let tokenManager: string;
let tokenAgent: string;

beforeEach(async () => {
  app = createTestApp();
  const adminRes = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });
  tokenAdmin = `Bearer ${adminRes.body.token}`;
  const mgrRes = await request(app).post("/api/auth/login").send({ username: "manager", password: "manager123" });
  tokenManager = `Bearer ${mgrRes.body.token}`;
  const agtRes = await request(app).post("/api/auth/login").send({ username: "agent", password: "agent123" });
  tokenAgent = `Bearer ${agtRes.body.token}`;
});

describe("auth", () => {
  it("returns 401 on bad credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });
  it("returns user+token on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "agent", password: "agent123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("Agent");
    expect(res.body.user.password).toBeUndefined();
  });
  it("returns 400 on missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("require auth", () => {
  it("returns 401 on unauthenticated user list", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });
  it("admin can list users", async () => {
    const res = await request(app).get("/api/users").set("Authorization", tokenAdmin);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });
});

describe("rbac", () => {
  it("agent cannot delete users (403)", async () => {
    const res = await request(app).delete("/api/users/1").set("Authorization", tokenAgent);
    expect(res.status).toBe(403);
  });
  it("manager cannot delete users (403)", async () => {
    const res = await request(app).delete("/api/users/1").set("Authorization", tokenManager);
    expect(res.status).toBe(403);
  });
  it("admin can create user (201)", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", tokenAdmin)
      .send({ name: "NewA", username: "newa", password: "abc123456", role: "Admin" });
    expect(res.status).toBe(201);
    expect(res.body.password).toBeUndefined();
  });
});

describe("surveys", () => {
  it("POST: returns 401 when unauthenticated", async () => {
    const res = await request(app).post("/api/surveys").send({});
    expect(res.status).toBe(401);
  });
  it("POST: creates a survey with satisfaction percentage", async () => {
    const res = await request(app)
      .post("/api/surveys")
      .set("Authorization", tokenAgent)
      .send({
        agentId: 3,
        patientName: "Test Patient",
        medicalNumber: "MRN-test001",
        roomNumber: "101",
        phoneNumber: "511112222",
        phoneCountryCode: "966",
        doctorName: "Dr. Test",
        interviewType: "Call",
        clinicType: "In-Patient",
        isSatisfied: true,
        recommend: "Yes",
        answers: [{ questionId: 1, score: 5 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.survey.id).toBeGreaterThan(0);
    expect(res.body.survey.satisfactionPercentage).toBeGreaterThan(0);
  });

  describe("PUT mass-assignment fix", () => {
    it("rejects overwriting agentId via allowlist schema", async () => {
      const create = await request(app)
        .post("/api/surveys")
        .set("Authorization", tokenAgent)
        .send({
          agentId: 3, patientName: "P", medicalNumber: "M01", roomNumber: "R1",
          phoneNumber: "966511111111", doctorName: "D", interviewType: "Call",
          clinicType: "In-Patient", isSatisfied: true, recommend: "Yes",
          answers: [{ questionId: 1, score: 4 }],
        });
      const sid = create.body.survey.id;
      const updated = await request(app)
        .put(`/api/surveys/${sid}`)
        .set("Authorization", tokenAgent)
        .send({ patientName: "Hijacked Name" });
      expect(updated.status).toBe(200);
      expect(updated.body.survey.agentId).toBe(3);
      expect(updated.body.survey.patientName).toBe("Hijacked Name");
    });
  });
});

describe("archive", () => {
  it("returns empty pagination when no surveys exist", async () => {
    const res = await request(app).get("/api/surveys/archive").set("Authorization", tokenAdmin);
    expect(res.status).toBe(200);
    expect(res.body.surveys).toEqual([]);
    expect(res.body.pagination.totalCount).toBe(0);
    expect(res.body.pagination.totalPages).toBe(1);
  });
});

describe("followup", () => {
  it("agent blocked from followup (403)", async () => {
    const res = await request(app)
      .post("/api/surveys/1/followup")
      .set("Authorization", tokenAgent)
      .send({ followupStatus: "تم الحل", reminderText: "" });
    expect(res.status).toBe(403);
  });
  it("manager can set followup", async () => {
    const create = await request(app)
      .post("/api/surveys")
      .set("Authorization", tokenAgent)
      .send({
        agentId: 3, patientName: "P2", medicalNumber: "M02", roomNumber: "RK2",
        phoneNumber: "512223333", doctorName: "Dr. K", interviewType: "Call",
        clinicType: "In-Patient", isSatisfied: false, recommend: "No",
        answers: [{ questionId: 1, score: 1 }],
      });
    const sid = create.body.survey.id;
    const follow = await request(app)
      .post(`/api/surveys/${sid}/followup`)
      .set("Authorization", tokenManager)
      .send({ followupStatus: "تم الحل", reminderText: "hello" });
    expect(follow.status).toBe(200);
    expect(follow.body.survey.followupStatus).toBe("تم الحل");
  });
});

describe("categories", () => {
  it("agent cannot create categories (403)", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", tokenAgent)
      .send({ nameEnglish: "FE", nameArabic: "ف" });
    expect(res.status).toBe(403);
  });
  it("admin can create and list categories", async () => {
    const createRes = await request(app)
      .post("/api/categories")
      .set("Authorization", tokenAdmin)
      .send({ nameEnglish: "Safety-ENG", nameArabic: "أمن عربي" });
    expect(createRes.status).toBe(201);
    const list = await request(app).get("/api/categories").set("Authorization", tokenAdmin);
    expect(list.body.find((c: any) => c.nameEnglish === "Safety-ENG")).toBeTruthy();
  });
});
