import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Capture the raw request body (needed for HMAC webhook verification).
 * Must be mounted BEFORE express.json()'s reviver for the webhook route.
 */
export function captureRawBody(req: RawBodyRequest, res: Response, buf: Buffer) {
  if (Buffer.isBuffer(buf)) {
    req.rawBody = buf;
  }
}

/**
 * Verify HMAC-SHA256 webhook signature from Evolution API.
 * Expects header `X-Evolution-Signature` (or `X-Hub-Signature-256` for
 * compatibility) of the form `sha256=<hex>`. When `EVOLUTION_WEBHOOK_SECRET`
 * is not configured, this middleware is permissive (logs a warning) so dev
 * environments aren't blocked — but in production you MUST set the secret.
 */
export function verifyWebhookSignature(secret: string) {
  return (req: RawBodyRequest, res: Response, next: NextFunction): void => {
    if (!secret) {
      // Permissive in dev. Force configuration in prod via docs.
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "Webhook secret not configured on server." });
        return;
      }
      next();
      return;
    }
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const sigHeader = (req.headers["x-evolution-signature"] as string) ??
      (req.headers["x-hub-signature-256"] as string) ??
      "";

    const match = /^sha256=([0-9a-fA-F]+)$/.exec(sigHeader);
    if (!match) {
      res.status(401).json({ error: "Missing signature header." });
      return;
    }

    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const got = match[1];
    if (
      expected.length !== got.length ||
      // timingSafeEqual requires equal length inputs
      !crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(got, "hex"))
    ) {
      res.status(401).json({ error: "Webhook signature mismatch." });
      return;
    }
    next();
  };
}
