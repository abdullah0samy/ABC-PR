import { Router } from "express";
import express from "express";
import { verifyWebhookSignature, captureRawBody, type RawBodyRequest } from "../middleware/webhook";
import { validate } from "../middleware/validate";
import { requireAnyAuthenticated, requireManagerOrAdmin } from "../middleware/auth";
import { simulateWebhookSchema } from "../schemas";
import { getDB, saveDB } from "../utils/db";
import { config } from "../config";
import { logger } from "../utils/logger";
import type { WhatsAppLogStatus } from "../types";

export const whatsappRouter = Router();

// Logs — admin/manager only.
whatsappRouter.get("/logs", requireManagerOrAdmin, (_req, res) => {
  res.json(getDB().whatsappLogs);
});

// Real webhook with raw-body capture (HMAC verification). Public endpoint,
// protected by signature verification when EVOLUTION_WEBHOOK_SECRET is set.
const webhookParser = express.json({ verify: captureRawBody });
whatsappRouter.post("/webhook", webhookParser, verifyWebhookSignature(config.evolution.webhookSecret), (req: RawBodyRequest, res) => {
  const payload = req.body ?? {};
  logger.info({ payload }, "[Webhook Received from Evolution API]");

  const event = payload.event || "messages.update";
  const data = payload.data;

  let logId = "";
  let newStatus: WhatsAppLogStatus | undefined;

  if (data && data.key) {
    logId = data.key.id || "";
    const evolutionStatus = data.status;
    if (evolutionStatus === "READ" || evolutionStatus === "PLAYED" || evolutionStatus === 3 || evolutionStatus === 4) {
      newStatus = "تمت القراءة";
    } else if (evolutionStatus === "DELIVERY_ACK" || evolutionStatus === 2) {
      newStatus = "مستلمة";
    } else {
      newStatus = "مرسلة";
    }
  } else if (payload.logId) {
    logId = payload.logId;
    if (payload.status === "تمت القراءة" || payload.status === "مستلمة" || payload.status === "مرسلة") {
      newStatus = payload.status;
    }
  }

  if (!logId) {
    res.status(400).json({ error: "لم يتم العثور على معرف الرسالة (id)." });
    return;
  }

  const db = getDB();
  const log = db.whatsappLogs.find((l) => l.id === logId);
  if (!log) {
    res.status(404).json({ error: `السجل ذو المعرف (${logId}) غير موجود.` });
    return;
  }
  if (newStatus) log.status = newStatus;
  log.webhookEvent = event;
  log.webhookUpdatedAt = new Date().toISOString();
  log.webhookRawPayload = JSON.stringify(payload);
  saveDB(db);

  res.json({
    message: "تم استقبال حدث الـ Webhook وتحديث الحالة بنجاح.",
    logId,
    status: log.status,
    updatedAt: log.webhookUpdatedAt,
  });
});

// Simulate webhook — manager/admin only (was previously public: critical #5 vector).
whatsappRouter.post("/simulate-webhook", requireManagerOrAdmin, validate({ body: simulateWebhookSchema }), (req, res) => {
  const { logId, status } = req.body;
  const db = getDB();
  const log = db.whatsappLogs.find((l) => l.id === logId);
  if (!log) {
    res.status(404).json({ error: "السجل ذو المعرف المذكور غير موجود." });
    return;
  }

  const evoStatus = status === "تمت القراءة" ? "READ" : status === "مستلمة" ? "DELIVERY_ACK" : "SERVER_ACK";
  const mockPayload = {
    event: "messages.update",
    instance: "ABC-Evolution-Instance-Main",
    data: { key: { id: logId, remoteJid: `${log.phoneNumber}@s.whatsapp.net`, fromMe: true }, status: evoStatus },
  };
  log.status = status;
  log.webhookEvent = mockPayload.event;
  log.webhookUpdatedAt = new Date().toISOString();
  log.webhookRawPayload = JSON.stringify(mockPayload);
  saveDB(db);
  res.json({ message: `تمت محاكاة حدث Webhook بنجاح (${evoStatus}) لتحديث حالة السجل ${logId}.`, log });
});
