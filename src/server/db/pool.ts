import pg from "pg";
import { config } from "../config";
import { logger } from "../utils/logger";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected PG pool error");
});

/** Test-only: replace pool for unit tests. */
export function setPool(newPool: pg.Pool): void {
  Object.assign(pool, newPool);
}

/** Shutdown pool gracefully. */
export async function closePool(): Promise<void> {
  await pool.end();
}
