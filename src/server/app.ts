import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { logger } from "./utils/logger";
import { apiRouter } from "./routes";
import { config } from "./config";
import { migrateLegacyPasswords } from "./utils/db";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: config.isProd ? (process.env.APP_URL ? [process.env.APP_URL] : false) : true,
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // JSON body parser with body size limit and raw-body capture for webhooks.
  app.use(
    express.json({
      limit: config.bodyLimit,
      verify(req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) {
        if (Buffer.isBuffer(buf)) (req as any).rawBody = buf;
      },
    }),
  );

  // Legacy password migration on first boot (idempotent).
  try {
    migrateLegacyPasswords();
  } catch (err) {
    logger.warn({ err }, "Legacy password migration skipped");
  }

  // API routes
  app.use("/api", apiRouter);

  // 404 for unmatched /api routes
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  // SPA / Vite middleware handled by startServer (not here) — except static fallback.
  return app;
}

export async function startServer(app = createApp()) {
  if (config.nodeEnv !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      logger.warn({ err }, "Vite middleware unavailable; running in static mode");
    }
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      logger.warn({ distPath }, "dist directory not found — SPA not served");
    }
  }

  // Global 4-arg error handler (last).
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "Unhandled error");
    if (err instanceof SyntaxError && "status" in err && (err as any).status === 400 && "body" in err) {
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }
    res.status(500).json({ error: "Internal server error." });
  });

  return new Promise<void>((resolve) => {
    app.listen(config.port, "0.0.0.0", () => {
      logger.info({ port: config.port, env: config.nodeEnv }, `Server running at http://localhost:${config.port}`);
      resolve();
    });
  });
}
