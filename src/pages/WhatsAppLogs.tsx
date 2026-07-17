import { Info } from "lucide-react";
import { useWhatsAppLogs, useSimulateWebhook } from "../hooks/useWhatsApp";

interface Props {
  isEnglish: boolean;
  t: (key: string) => string;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export default function WhatsAppLogs({ isEnglish, t, triggerNotification }: Props) {
  const { data: logs, isLoading, error } = useWhatsAppLogs();
  const simulateWebhookMutation = useSimulateWebhook();

  const handleSimulateWebhook = (logId: string, status: "مرسلة" | "مستلمة" | "تمت القراءة") => {
    simulateWebhookMutation.mutate(
      { logId, status },
      {
        onSuccess: (data) => {
          triggerNotification("success", data.message || `تمت محاكاة تحديث الـ Webhook بنجاح إلى (${status})`);
        },
        onError: (err: any) => {
          triggerNotification("error", err.message || "حدث خطأ في الشبكة أثناء محاكاة الطلب.");
        },
      },
    );
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp/webhook`);
    triggerNotification("success", "تم نسخ رابط الـ Webhook إلى الحافظة.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-rose-600">فشل تحميل سجلات الواتساب</p>
        <p className="text-xs text-rose-500 mt-1">{(error as any)?.message || "خطأ في الشبكة"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800">سجلات إشعارات الـ WhatsApp الفورية</h2>
          <p className="text-sm font-medium text-slate-500">تتبع حي ومباشر لكافة رسائل الاعتذار المؤتمتة عبر بوابة Evolution API</p>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-white py-2 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
          <span>العدد الإجمالي للجلسة: {logs?.length || 0} إشعار ذكي</span>
        </div>
      </div>

      {/* Webhook Info */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#00448c]/10 text-[#00448c] rounded-xl font-bold text-lg shrink-0">📡</div>
          <div className="space-y-1.5 text-right w-full">
            <h3 className="font-bold text-sm text-slate-800">رابط الويب هوك الخاص بـ Evolution API (Live Webhook Endpoint)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              لاستقبال حالات الرسائل الحقيقية (تم الإرسال والوصول والقراءة) مباشرة من خادوم تفعيل الواتساب الخاص بك، قم بتهيئة الـ Webhook في خيارات Evolution API للإجراء <code className="bg-slate-100 font-mono text-xs px-1.5 py-0.5 rounded text-rose-600 font-semibold">messages.update</code> على الرابط التالي:
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-3 rounded-xl border border-slate-100 text-xs shadow-xs">
          <span className="font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg shrink-0 block sm:inline-block">رابط الـ Webhook:</span>
          <input
            type="text"
            readOnly
            value={`${window.location.origin}/api/whatsapp/webhook`}
            className="flex-1 font-mono text-slate-600 bg-transparent outline-none text-left select-all shrink focus:ring-0 cursor-text"
            dir="ltr"
          />
          <button
            onClick={copyWebhookUrl}
            className="px-3 py-1.5 font-bold text-xs bg-[#00448c] text-white hover:bg-opacity-90 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            نسخ الرابط
          </button>
        </div>
        <div className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-1.5">
          <Info size={14} className="text-slate-400 shrink-0" />
          <span>يمكنك تجربة التحديث الحي مباشرة أسفل الجدول باستخدام أزرار محاكاة الـ Webhook لكل سجل لتغيير حالتها في قاعدة البيانات فوراً.</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs bg-white">
            <thead className="bg-[#f9f9ff] text-slate-400 font-bold uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">رقم السجل</th>
                <th className="px-6 py-4">رقم هاتف المريض</th>
                <th className="px-6 py-4">الرقم الطبي (MRN)</th>
                <th className="px-6 py-4">توقيت وتاريخ الإرسال</th>
                <th className="px-6 py-4">حالة الإرسال الابتدائية</th>
                <th className="px-6 py-4">الحالة الحقيقية لوصول الرسالة (الويب هوك)</th>
                <th className="px-6 py-4 text-center">تحديثات الـ Webhook الحقيقية</th>
                <th className="px-6 py-4">مضمون ونقش رسالة الاعتذار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs || []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#00448c]">{log.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600" dir="ltr">+{log.phoneNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{log.medicalNumber}</td>
                  <td className="px-6 py-4 text-slate-400 font-medium whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString("ar-SA", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4">
                    {log.status === "تمت القراءة" ? (
                      <span className="bg-emerald-50 text-emerald-850 border border-emerald-100 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        ✔✔ تمت القراءة (Read)
                      </span>
                    ) : log.status === "مستلمة" ? (
                      <span className="bg-sky-50 text-sky-850 border border-sky-100 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
                        ✓✓ مستلمة (Delivered)
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-800 border border-blue-105 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1 shrink-0">
                        ✓ مرسلة (Sent)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.webhookUpdatedAt ? (
                      log.status === "تمت القراءة" ? (
                        <span className="bg-teal-600 text-white font-black px-3 py-1.5 rounded-xl text-[10px] inline-flex items-center gap-1.5 shadow-xs border border-teal-700">
                          <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                          تمت القراءة حياً (Webhook Read)
                        </span>
                      ) : log.status === "مستلمة" ? (
                        <span className="bg-sky-600 text-white font-black px-3 py-1.5 rounded-xl text-[10px] inline-flex items-center gap-1.5 shadow-xs border border-sky-700">
                          <span className="w-2 h-2 bg-white rounded-full"></span>
                          مستلمة حياً (Webhook Delivered)
                        </span>
                      ) : (
                        <span className="bg-amber-500 text-white font-black px-3 py-1.5 rounded-xl text-[10px] inline-flex items-center gap-1.5 shadow-xs border border-amber-600">
                          مرسلة للتو (Webhook Sent)
                        </span>
                      )
                    ) : (
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 font-bold px-3 py-1.5 rounded-xl text-[10px] inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-pulse"></span>
                        بانتظار إفادة الويب هوك...
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center gap-1.5 text-right w-full min-w-[200px] bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                      {log.webhookUpdatedAt ? (
                        <div className="space-y-1 w-full text-center">
                          <div className="flex items-center justify-center gap-1 text-[9.5px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md font-bold mx-auto w-fit">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                            <span>{log.webhookEvent || "messages.update"}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {new Date(log.webhookUpdatedAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </div>
                          {(() => {
                            const diffMs = new Date(log.webhookUpdatedAt).getTime() - new Date(log.sentAt).getTime();
                            const diffSec = Math.max(0, Math.floor(diffMs / 1000));
                            return (
                              <div className="text-[9px] text-[#00448c] font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mx-auto leading-none">
                                ⏱️ الاستجابة: {diffSec} ثانية
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[9.5px] p-1 font-bold flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-350 animate-pulse"></span>
                          بانتظار حدث Webhook...
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-1 mt-1 w-full border-t border-slate-100 pt-1.5">
                        <button
                          onClick={() => handleSimulateWebhook(log.id, "مستلمة")}
                          className="px-2 py-1 text-[9.5px] font-bold text-sky-700 bg-white hover:bg-sky-50 rounded border border-sky-100 transition-colors cursor-pointer active:scale-95 flex-1 text-center"
                          title="محاكاة حدث استلام الرسالة"
                        >
                          استلام ✓✓
                        </button>
                        <button
                          onClick={() => handleSimulateWebhook(log.id, "تمت القراءة")}
                          className="px-2 py-1 text-[9.5px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 rounded border border-emerald-100 transition-colors cursor-pointer active:scale-95 flex-1 text-center"
                          title="محاكاة حدث قراءة الرسالة"
                        >
                          قراءة ✔✔
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-sm">
                    <p className="text-slate-600 leading-relaxed bg-[#f8fafc] p-2.5 rounded-lg border border-slate-100 cursor-pointer text-[11px]" title={log.message}>
                      {log.message}
                    </p>
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold text-xs bg-slate-50/50">
                    لا توجد رسائل تلقائية مسجلة لعدم رصد أي تقييم سلبي حتى الآن.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
