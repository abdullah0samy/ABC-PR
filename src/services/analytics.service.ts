import { get } from "./api-client";
import type { Analytics } from "../types";

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  clinicType?: string;
}

export const analyticsService = {
  get(params: AnalyticsParams) {
    return get<Analytics>("/api/analytics", {
      params: params as Record<string, string | boolean | undefined | null>,
    });
  },
};
