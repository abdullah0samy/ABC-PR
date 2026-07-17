import path from "path";

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    // In dev we tolerate missing secrets with a fallback, but warn loudly.
    console.warn(`[config] Environment variable ${name} is not set.`);
    return fallback ?? "";
  }
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: (process.env.NODE_ENV ?? "development") === "production",
  jwt: {
    secret: requireEnv("JWT_SECRET", "dev_insecure_secret_change_me_in_production_at_least_32_characters_long_!!"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  },
  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL ?? "https://api.evolution.example.com/message/sendText",
    apiKey: process.env.EVOLUTION_API_KEY ?? "",
    webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET ?? "",
    // Outbound fetch timeout (AbortController) in milliseconds.
    fetchTimeoutMs: parseInt(process.env.EVOLUTION_FETCH_TIMEOUT_MS ?? "8000", 10),
  },
  // Absolute path to JSON db file (cwd-independent).
  dbFile: path.resolve(process.env.DB_FILE ?? path.join(process.cwd(), "db_data.json")),
  // Body size limit for JSON requests.
  bodyLimit: "1mb",
};

export type Config = typeof config;
