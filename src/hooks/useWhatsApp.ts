import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappService } from "../services/whatsapp.service";

const WHATSAPP_KEY = ["whatsapp-logs"] as const;

export function useWhatsAppLogs() {
  return useQuery({
    queryKey: WHATSAPP_KEY,
    queryFn: () => whatsappService.logs(),
    staleTime: 15_000,
  });
}

export function useSimulateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, status }: { logId: string; status: "مرسلة" | "مستلمة" | "تمت القراءة" }) =>
      whatsappService.simulateWebhook(logId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WHATSAPP_KEY });
    },
  });
}
