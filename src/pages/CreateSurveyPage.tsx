import React, { useState } from "react";
import {
  User,
  Smile,
  Frown,
  HelpCircle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { COUNTRIES } from "../constants";
import { useQuestions } from "../hooks/useQuestions";
import { useCreateSurvey } from "../hooks/useSurveys";
import { getCategoryArabic } from "../utils/categories";
import type { User as UserType, Question } from "../types";

interface Props {
  user: UserType;
  isEnglish: boolean;
  isDarkMode: boolean;
  triggerNotification: (type: "success" | "error", text: string) => void;
  onCreateSurvey: () => void;
}

export default function CreateSurveyPage({
  user,
  isEnglish,
  isDarkMode,
  triggerNotification,
  onCreateSurvey,
}: Props) {
  const { data: questions = [], isLoading } = useQuestions();
  const createSurvey = useCreateSurvey();

  const [patientName, setPatientName] = useState("");
  const [medicalNumber, setMedicalNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("966");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [enterDate, setEnterDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [interviewType, setInterviewType] = useState<"Call" | "In Person">("Call");
  const [clinicType, setClinicType] = useState<"In-Patient" | "Out-Patient">("In-Patient");
  const [isSatisfied, setIsSatisfied] = useState<boolean>(true);
  const [recommend, setRecommend] = useState<"Yes" | "No" | "">("");
  const [surveyRatings, setSurveyRatings] = useState<Record<number, number>>({});

  const handleRateQuestion = (questionId: number, score: number) => {
    const updated = { ...surveyRatings, [questionId]: score };
    setSurveyRatings(updated);
    const poorCount = Object.values(updated).filter((r: number) => r <= 2).length;
    setIsSatisfied(poorCount < 2);
  };

  const resetSurveyForm = () => {
    setPatientName("");
    setMedicalNumber("");
    setRoomNumber("");
    setPhoneNumber("");
    setPhoneCountryCode("966");
    setDoctorName("");
    setRecommend("");
    setIsSatisfied(true);
    setSurveyRatings({});
  };

  const handleSubmitSurvey = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) return triggerNotification("error", "يرجى كتابة اسم المريض بالكامل.");
    if (!medicalNumber.trim()) return triggerNotification("error", "يرجى كتابة الرقم الطبي للمريض.");
    if (!phoneNumber.trim() || phoneNumber.length < 5) return triggerNotification("error", "يرجى كتابة رقم هاتف فعال للتغذية الراجعة والواتساب.");
    if (!doctorName.trim()) return triggerNotification("error", "يرجى تحديد اسم الطبيب المعالج.");
    if (recommend === "") return triggerNotification("error", "يرجى الإجابة على سؤال الـ NPS (هل ترشح المستشفى؟).");

    const visibleQuestions = questions.filter(
      (q: Question) => q.templateId === (clinicType === "In-Patient" ? 1 : 2),
    );
    const unanswered = visibleQuestions.filter((q: Question) => !surveyRatings[q.id]);
    if (unanswered.length > 0) {
      return triggerNotification("error", "يرجى الإجابة على جميع أسئلة التقييم أولاً.");
    }

    const answersPayload = Object.entries(surveyRatings).map(([qId, score]) => ({
      questionId: parseInt(qId),
      score,
    }));

    const payload = {
      agentId: user?.id || 3,
      patientName,
      medicalNumber,
      roomNumber,
      phoneNumber,
      phoneCountryCode: phoneCountryCode.length >= 1 ? phoneCountryCode : undefined,
      doctorName,
      enterDate,
      interviewType,
      clinicType,
      isSatisfied,
      recommend,
      answers: answersPayload,
    };

    createSurvey.mutate(payload, {
      onSuccess: () => {
        triggerNotification("success", isEnglish ? "Survey successfully submitted!" : "تم حفظ وإرسال استبيان المريض بنجاح.");
        resetSurveyForm();
        onCreateSurvey();
      },
      onError: (err: any) => {
        triggerNotification("error", err.message || (isEnglish ? "An unexpected error occurred." : "حدث خطأ غير متوقع أثناء حفظ التقييم."));
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-800">نموذج تقييم جديد لرضا الزوار</h2>
        <p className="text-sm font-medium text-slate-500">يرجى تسجيل كافة البيانات المطلوبة للمريض بصدق وموضوعية أثناء المقابلة</p>
      </div>

      <form onSubmit={handleSubmitSurvey} className="space-y-6">
        {/* Section 1: Patient Data */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600"></div>
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="text-blue-600" size={18} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">أولاً: البيانات الأساسية للمريض</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">اسم المريض بالكامل</label>
              <input type="text" required placeholder="مثال: أحمد محمد علي" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">الرقم الطبي للمريض (MRN)</label>
              <input type="text" required placeholder="MRN-XXXXX" value={medicalNumber} onChange={(e) => setMedicalNumber(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">رقم الهاتف الفعال (مع رمز الدولة)</label>
              <div className="flex gap-2">
                <select value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-2 text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-slate-800 dark:text-white cursor-pointer">
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>+{c.code} ({c.name})</option>
                  ))}
                </select>
                <input type="tel" required placeholder="5XXXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} dir="ltr"
                  className="flex-1 h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">رقم الغرفة / اسم العيادة الخارجية</label>
              <input type="text" required placeholder="مثال: جناح 402-A أو عيادة الأطفال" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">اسم الدكتور المشرف المعالج</label>
              <input type="text" required placeholder="د. خالد حسن" value={doctorName} onChange={(e) => setDoctorName(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">تاريخ المقابلة / الإدخال</label>
              <input type="date" required value={enterDate} onChange={(e) => setEnterDate(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white" />
            </div>
          </div>
        </div>

        {/* Section 2: Clinical selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider">محددات المقابلة والعيادات</h3>
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1.5">طريقة المقابلة التقييمية</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button type="button" onClick={() => setInterviewType("Call")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      interviewType === "Call" ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>مكالمة هاتفية (Call)</button>
                  <button type="button" onClick={() => setInterviewType("In Person")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      interviewType === "In Person" ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>مقابلة حضورية (In Person)</button>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1.5">فئة ونوع العيادات المزارة</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button type="button" onClick={() => { setClinicType("In-Patient"); setSurveyRatings({}); }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      clinicType === "In-Patient" ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>تنويم داخلي (In-Patient)</button>
                  <button type="button" onClick={() => { setClinicType("Out-Patient"); setSurveyRatings({}); }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      clinicType === "Out-Patient" ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>عيادات خارجية (Out-Patient)</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-2">الحالة العامة لرضا المريض</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">يتم احتساب الحالة ومتابعتها تلقائياً بناءً على إجابات الأسئلة التفصيلية لإفادة الإدارة العليا والاعتذار الفوري عند الاقتضاء.</p>
            </div>
            <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors mt-4 ${
              isSatisfied ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/60 text-rose-800 dark:text-rose-300"}`}>
              <span className="flex items-center gap-2 font-semibold text-sm">
                {isSatisfied ? <Smile size={20} className="text-emerald-600" /> : <Frown size={20} className="text-rose-600" />}
                <span>{isSatisfied ? "المريض راضٍ عن جودة الخدمات" : "المريض مستاء / غير راضٍ (تنبيه)"}</span>
              </span>
              <button type="button" onClick={() => setIsSatisfied(!isSatisfied)}
                className={`w-14 h-8 rounded-full transition-all relative overflow-hidden flex items-center cursor-pointer ${isSatisfied ? "bg-emerald-500" : "bg-rose-500"}`}>
                <span className={`w-6 h-6 bg-white rounded-full shadow-xs absolute top-1 transition-all ${isSatisfied ? "left-1" : "left-7"}`}></span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Questions with emoji ratings */}
        <div className="bg-white border border-slate-205 p-6 rounded-2xl shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HelpCircle className="text-blue-600" size={18} />
            <h3 className="text-sm font-bold text-slate-800">ثانياً: أسئلة التقييم التفصيلية للفئة</h3>
          </div>

          <div className="space-y-4">
            {questions
              .filter((q: Question) => q.templateId === (clinicType === "In-Patient" ? 1 : 2))
              .map((q: Question, qIndex: number) => (
                <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-semibold text-slate-800 leading-normal">{qIndex + 1}. {q.text}</p>
                    <span className="bg-slate-200/60 text-slate-600 font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase shrink-0">
                      {getCategoryArabic(q.category)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between max-w-lg mx-auto bg-white p-3 rounded-xl border border-slate-200">
                    {[
                      { score: 1, label: "سيء جداً", emoji: "😡" },
                      { score: 2, label: "سيء", emoji: "😟" },
                      { score: 3, label: "متوسط", emoji: "😐" },
                      { score: 4, label: "جيد", emoji: "🙂" },
                      { score: 5, label: "ممتاز", emoji: "🤩" },
                    ].map((scale) => {
                      const isActive = surveyRatings[q.id] === scale.score;
                      return (
                        <button key={scale.score} type="button" onClick={() => handleRateQuestion(q.id, scale.score)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all grow cursor-pointer ${
                            isActive ? "bg-blue-50 border border-blue-200 scale-105 shadow-xs" : "hover:bg-slate-50 border border-transparent text-slate-400"}`}>
                          <span className="text-2xl filter drop-shadow-sm">{scale.emoji}</span>
                          <span className={`text-[9px] font-semibold ${isActive ? "text-blue-700" : "text-slate-400"}`}>{scale.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          {/* NPS */}
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <div className="text-right leading-relaxed">
              <p className="text-xs font-semibold text-slate-800">مؤشر صافي الترويج للمنشأة الطبية (NPS) / هل توصي بالمستشفى لأصدقائك أو عائلتك عند الحاجة؟</p>
              <p className="text-[10px] text-slate-400 font-semibold">مؤشر أساسي لتقييم ولاء وثقة الزوار للخدمة والمرفق</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setRecommend("Yes")}
                className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs border transition-all cursor-pointer ${
                  recommend === "Yes" ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                <ThumbsUp size={16} /><span>نعم، بالتأكيد (أوصي بشدة)</span>
              </button>
              <button type="button" onClick={() => { setRecommend("No"); setIsSatisfied(false); }}
                className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs border transition-all cursor-pointer ${
                  recommend === "No" ? "bg-rose-50 border-rose-500 text-rose-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                <ThumbsDown size={16} /><span>لا، لا أوصي بالمنشأة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={createSurvey.isPending}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 select-none active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed">
            {createSurvey.isPending ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>جاري حفظ وتشفير التقييم...</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>إرسال وحفظ تقييم المريض الفوري</span>
              </>
            )}
          </button>
          <button type="button" onClick={resetSurveyForm}
            className="h-12 px-6 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-xs cursor-pointer transition-all active:scale-95">
            مسح البيانات والبدء مجدداً
          </button>
        </div>
      </form>
    </div>
  );
}