import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
import type { AnalyticsParams } from "../services/analytics.service";

export function useAnalytics(params: AnalyticsParams, enabled = true) {
  return useQuery({
    queryKey: ["analytics", params],
    queryFn: () => analyticsService.get(params),
    enabled,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}
