import type { ApiErrorResponse, ValidationErrorResponse } from "./types";

const TOKEN_KEY = "nuzul_pr_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // storage unavailable
  }
}

// --- Global callbacks (set by provider) ---

let onUnauthorized: (() => void) | null = null;
let onForbidden: (() => void) | null = null;
let onToast: ((type: "success" | "error", message: string) => void) | null = null;

export function setApiClientCallbacks(opts: {
  onUnauthorized?: () => void;
  onForbidden?: () => void;
  onToast?: (type: "success" | "error", message: string) => void;
}): void {
  if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized;
  if (opts.onForbidden) onForbidden = opts.onForbidden;
  if (opts.onToast) onToast = opts.onToast;
}

// --- Request config ---

interface RequestConfig {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Query params appended to URL */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Timeout in ms (default 15s) */
  timeout?: number;
  /** Retry for idempotent methods? (default true for GET/HEAD/OPTIONS/PUT/DELETE) */
  retry?: boolean;
  /** Max retries (default 1) */
  maxRetries?: number;
  /** Return raw Response instead of parsed body (for blobs) */
  raw?: boolean;
  /** FormData for multipart uploads */
  formData?: FormData;
}

const BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "";

function shouldRetry(method: string): boolean {
  const idempotent = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"];
  return idempotent.includes(method.toUpperCase());
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ApiError {
  constructor(details: Record<string, string[]>, message = "Validation failed") {
    super(message, 422, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Core request function. Every API call goes through here.
 */
export async function request<T>(url: string, config: RequestConfig = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    params,
    signal: externalSignal,
    timeout = 15000,
    retry = shouldRetry(method),
    maxRetries = 1,
    raw = false,
    formData,
  } = config;

  // Build URL with query params
  const urlObj = new URL(url, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        urlObj.searchParams.set(key, String(val));
      }
    });
  }
  const fullUrl = urlObj.toString();

  // Auth header
  const token = getToken();
  const requestHeaders: Record<string, string> = { ...headers };
  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }
  if (!formData) {
    requestHeaders["Content-Type"] ??= "application/json";
  }

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine with external signal
  const signal = externalSignal
    ? combineAbortSignals(externalSignal, controller.signal)
    : controller.signal;

  let attempt = 0;

  while (true) {
    attempt++;
    try {
      const res = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: formData ?? (body ? JSON.stringify(body) : undefined),
        signal,
      });

      clearTimeout(timeoutId);

      // Handle auth errors globally
      if (res.status === 401) {
        setToken(null);
        onUnauthorized?.();
        throw new ApiError("Unauthorized", 401);
      }
      if (res.status === 403) {
        onForbidden?.();
        throw new ApiError("Forbidden", 403);
      }

      if (raw) {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new ApiError(text || `Request failed (${res.status})`, res.status);
        }
        return res as unknown as T;
      }

      const contentType = res.headers.get("content-type") ?? "";
      let data: unknown;

      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => null);
      } else {
        data = await res.text().catch(() => null);
      }

      if (!res.ok) {
        const errBody = data as ApiErrorResponse | ValidationErrorResponse | null;

        // Validation errors (422)
        if (res.status === 422 && errBody && "details" in errBody && errBody.details) {
          throw new ValidationError(errBody.details, errBody.error || "Validation failed");
        }

        throw new ApiError(
          errBody?.error || `Request failed (${res.status})`,
          res.status,
          errBody?.code,
          errBody && "details" in errBody ? errBody.details : undefined,
        );
      }

      return data as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // Don't retry if aborted by consumer
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError("Request cancelled", 0, "CANCELLED");
      }

      // Don't retry for 4xx (except 429/408)
      if (err instanceof ApiError) {
        const status = err.status;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          throw err;
        }
        // Retry 408/429
        if (retry && attempt <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await sleep(delay);
          continue;
        }
        throw err;
      }

      // Network errors — retry if configured
      if (retry && attempt <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await sleep(delay);
        continue;
      }

      throw new ApiError(
        err instanceof Error ? err.message : "Network error",
        0,
        "NETWORK_ERROR",
      );
    }
  }
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

// --- Typed helpers ---

export function get<T>(url: string, config?: RequestConfig): Promise<T> {
  return request<T>(url, { ...config, method: "GET" });
}

export function post<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>(url, { ...config, method: "POST", body });
}

export function put<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>(url, { ...config, method: "PUT", body });
}

export function del<T>(url: string, config?: RequestConfig): Promise<T> {
  return request<T>(url, { ...config, method: "DELETE" });
}

export function upload<T>(url: string, formData: FormData, config?: RequestConfig): Promise<T> {
  return request<T>(url, { ...config, method: "POST", formData });
}

export function download(url: string, config?: RequestConfig): Promise<Blob> {
  return request<Response>(url, { ...config, method: "GET", raw: true }).then((res) =>
    res.blob(),
  );
}
