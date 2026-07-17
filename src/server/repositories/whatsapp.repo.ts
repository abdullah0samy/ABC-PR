import { pool } from "../db/pool";
import type { WhatsappLog, WhatsAppLogStatus } from "../types";

function rowToLog(row: Record<string, unknown>): WhatsappLog {
  return {
    id: row.id as string,
    phoneNumber: row.phone_number as string,
    message: row.message as string,
    sentAt: (row.sent_at as Date).toISOString(),
    medicalNumber: row.medical_number as string,
    status: row.status as WhatsAppLogStatus,
    webhookEvent: (row.webhook_event as string) ?? undefined,
    webhookUpdatedAt: (row.webhook_updated_at as Date)?.toISOString() ?? undefined,
    webhookRawPayload: (row.webhook_raw_payload as string) ?? undefined,
  };
}

export const whatsappRepo = {
  async listAll(): Promise<WhatsappLog[]> {
    const res = await pool.query("SELECT * FROM whatsapp_logs ORDER BY sent_at DESC");
    return res.rows.map(rowToLog);
  },

  async findById(id: string): Promise<WhatsappLog | null> {
    const res = await pool.query("SELECT * FROM whatsapp_logs WHERE id = $1", [id]);
    return res.rows[0] ? rowToLog(res.rows[0]) : null;
  },

  async create(data: {
    id: string;
    phoneNumber: string;
    message: string;
    medicalNumber: string;
  }): Promise<WhatsappLog> {
    const res = await pool.query(
      `INSERT INTO whatsapp_logs (id, phone_number, message, medical_number, status)
       VALUES ($1, $2, $3, $4, 'مرسلة')
       RETURNING *`,
      [data.id, data.phoneNumber, data.message, data.medicalNumber],
    );
    return rowToLog(res.rows[0]);
  },

  async updateWebhook(
    id: string,
    data: {
      status?: WhatsAppLogStatus;
      webhookEvent: string;
      webhookRawPayload: string;
    },
  ): Promise<WhatsappLog | null> {
    const fields = ["webhook_event = $2", "webhook_updated_at = NOW()", "webhook_raw_payload = $3"];
    const values: unknown[] = [id, data.webhookEvent, data.webhookRawPayload];
    let idx = 4;

    if (data.status) {
      fields.push(`status = $${idx}`);
      values.push(data.status);
      idx++;
    }

    const res = await pool.query(
      `UPDATE whatsapp_logs SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
      values,
    );
    return res.rows[0] ? rowToLog(res.rows[0]) : null;
  },
};
