import { Router } from "express";
import express from "express";
import { verifyWebhookSignature, captureRawBody, type RawBodyRequest } from "../middleware/webhook";
import { validate } from "../middleware/validate";
import { requireAnyAuthenticated, requireManagerOrAdmin } from "../middleware/auth";
import { simulateWebhookSchema } from "../schemas";
import { whatsappRepo } from "../repositories";
import { config } from "../config";
import { logger } from "../utils/logger";

export const whatsappRouter = Router();

// Logs — admin/manager only.
whatsappRouter.get("/logs", requireManagerOrAdmin, async (_req, res) => {
  const logs = await whatsappRepo.listAll();
  res.json(logs);
});

// Real webhook with raw-body capture (HMAC verification).
const webhookParser = express.json({ verify: captureRawBody });
whatsappRouter.post("/webhook", webhookParser, verifyWebhookSignature(config.evolution.webhookSecret), async (req: RawBodyRequest, res) => {
  const payload = req.body ?? {};
  logger.info({ payload }, "[Webhook Received from Evolution API]");

  const event = payload.event || "messages.update";
  const data = payload.data;

  let logId = "";
  let newStatus: string | undefined;

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

  const existing = await whatsappRepo.findById(logId);
  if (!existing) {
    res.status(404).json({ error: `السجل ذو المعرف (${logId}) غير موجود.` });
    return;
  }

  const updated = await whatsappRepo.updateWebhook(logId, {
    status: newStatus as any,
    webhookEvent: event,
    webhookRawPayload: JSON.stringify(payload),
  });

  res.json({
    message: "تم استقبال حدث الـ Webhook وتحديث الحالة بنجاح.",
    logId,
    status: updated?.status,
    updatedAt: updated?.webhookUpdatedAt,
  });
});

// Simulate webhook — manager/admin only.
whatsappRouter.post("/simulate-webhook", requireManagerOrAdmin, validate({ body: simulateWebhookSchema }), async (req, res) => {
  const { logId, status } = req.body;

  const existing = await whatsappRepo.findById(logId);
  if (!existing) {
    res.status(404).json({ error: "السجل ذو المعرف المذكور غير موجود." });
    return;
  }

  const evoStatus = status === "تمت القراءة" ? "READ" : status === "مستلمة" ? "DELIVERY_ACK" : "SERVER_ACK";
  const mockPayload = {
    event: "messages.update",
    instance: "ABC-Evolution-Instance-Main",
    data: { key: { id: logId, remoteJid: `${existing.phoneNumber}@s.whatsapp.net`, fromMe: true }, status: evoStatus },
  };

  const updated = await whatsappRepo.updateWebhook(logId, {
    status: status,
    webhookEvent: mockPayload.event,
    webhookRawPayload: JSON.stringify(mockPayload),
  });

  res.json({ message: `تمت محاكاة حدث Webhook بنجاح (${evoStatus}) لتحديث حالة السجل ${logId}.`, log: updated });
});
