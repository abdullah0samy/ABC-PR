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
import { pool, closePool } from "./db/pool";
import { runMigration } from "./db/migrate";

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

  // Health check endpoint (for Docker HEALTHCHECK)
  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "connected" });
    } catch {
      res.status(503).json({ status: "error", db: "disconnected" });
    }
  });

  // API routes
  app.use("/api", apiRouter);

  // 404 for unmatched /api routes
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  return app;
}

export async function startServer(app = createApp()) {
  // Initialize PostgreSQL (schema + migration)
  try {
    await runMigration();
    logger.info("PostgreSQL initialized");
  } catch (err) {
    logger.fatal({ err }, "PostgreSQL migration failed — refusing to start");
    process.exit(1);
  }

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

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    await closePool();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return new Promise<void>((resolve) => {
    app.listen(config.port, "0.0.0.0", () => {
      logger.info({ port: config.port, env: config.nodeEnv }, `Server running at http://localhost:${config.port}`);
      resolve();
    });
  });
}
