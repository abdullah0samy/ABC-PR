import { get, post } from "./api-client";
import type { WhatsappLog } from "../types";

export const whatsappService = {
  logs() {
    return get<WhatsappLog[]>("/api/whatsapp/logs");
  },

  simulateWebhook(logId: string, status: "مرسلة" | "مستلمة" | "تمت القراءة") {
    return post<{ message: string; log: WhatsappLog }>("/api/whatsapp/simulate-webhook", {
      logId,
      status,
    });
  },
};
