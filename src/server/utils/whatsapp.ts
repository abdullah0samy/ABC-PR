import { randomBytes } from "crypto";
import { config } from "../config";
import { whatsappRepo } from "../repositories";
import { logger } from "./logger";
import type { Survey } from "../types";

/** Fire WhatsApp apology (fire-and-forget, but with timeout & logged failures). */
export async function triggerWhatsAppApology(survey: Survey): Promise<void> {
  const apologyText =
    `أهلاً بحضرتك يا فندم، نعتذر جداً لعدم رضاك الكامل عن الخدمة خلال زيارتك للمستشفى. ` +
    `نود إعلامك بأن شكواك قد وصلت مباشرة للإدارة العليا وتم تسجيلها برقم طبي (${survey.medicalNumber}) ` +
    `وتحت رعاية الطبيب المعالج (${survey.doctorName}). ` +
    `سيتواصل معك أحد مدراء الأقسام فوراً للاستماع لك وحل المشكلة بشكل نهائي. شكراً لمساعدتنا في تحسين خدماتنا.`;

  const logId = randomBytes(6).toString("hex").toUpperCase();
  await whatsappRepo.create({
    id: logId,
    phoneNumber: survey.phoneNumber,
    message: apologyText,
    medicalNumber: survey.medicalNumber,
  });

  // Outbound send to Evolution API with timeout — never block the response.
  void sendToEvolution(survey.phoneNumber, apologyText, logId).catch((err) => {
    logger.warn({ err, logId }, "Evolution API send failed");
  });
}

async function sendToEvolution(phoneNumber: string, text: string, logId: string): Promise<void> {
  if (!config.evolution.apiKey || config.evolution.apiKey === "dummy_api_key") {
    logger.debug({ logId }, "Skipping Evolution send: no API key configured");
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.evolution.fetchTimeoutMs);
  try {
    const resp = await fetch(config.evolution.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.evolution.apiKey,
      },
      body: JSON.stringify({
        number: phoneNumber,
        options: { delay: 1200, presence: "composing" },
        textMessage: { text },
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      logger.warn({ logId, status: resp.status, statusText: resp.statusText }, "Evolution API non-2xx");
    }
  } catch (err) {
    logger.warn({ err, logId }, "Evolution API fetch error (timeout/network)");
  } finally {
    clearTimeout(timeout);
  }
}
