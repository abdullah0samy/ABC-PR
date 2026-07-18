import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useArchive } from "../hooks/useSurveys";
import type { Survey, SurveyWithSatisfaction, User as UserType } from "../types";

interface Props {
  user: UserType;
  archiveSearch: string;
  setArchiveSearch: (v: string) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
  onEditSurvey: (survey: Survey) => void;
  onViewDetail: (id: number) => void;
  onDeleteSurvey: (id: number) => void;
}

export default function ArchivePage({
  user,
  archiveSearch,
  setArchiveSearch,
  triggerNotification,
  onEditSurvey,
  onViewDetail,
  onDeleteSurvey,
}: Props) {
  const [archiveClinicType, setArchiveClinicType] = useState("الكل");
  const [archiveInterviewType, setArchiveInterviewType] = useState("الكل");
  const [archiveSatisfaction, setArchiveSatisfaction] = useState("الكل");
  const [archiveStartDate, setArchiveStartDate] = useState("");
  const [archiveEndDate, setArchiveEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // When the external search box updates, reset pagination so the user sees
  // newest filtered results from page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [archiveSearch]);

  const { data, isLoading, isFetching, error } = useArchive({
    search: archiveSearch,
    clinicType: archiveClinicType,
    interviewType: archiveInterviewType,
    satisfaction: archiveSatisfaction,
    startDate: archiveStartDate,
    endDate: archiveEndDate,
    page: currentPage,
    limit: 20,
  });

  const surveys: SurveyWithSatisfaction[] = data?.surveys ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;
  const totalSurveysCount = data?.pagination.totalCount ?? 0;

  const clearArchiveFilters = () => {
    setArchiveClinicType("الكل");
    setArchiveInterviewType("الكل");
    setArchiveSatisfaction("الكل");
    setArchiveStartDate("");
    setArchiveEndDate("");
    setArchiveSearch("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800">أرشيف وسجلات رضا المرضى والزوار</h2>
          <p className="text-sm font-medium text-slate-500">مراجعة والبحث عن أي استبيان سابق وتصفية البيانات التفصيلية للمرضى</p>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-white py-2 px-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
          <span>العدد الكلي: {totalSurveysCount} تقييم مسجل</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="relative">
          <Search className="absolute right-3.5 top-3.5 text-slate-400" size={18} />
          <input
            type="text"
            value={archiveSearch}
            onChange={(e) => { setArchiveSearch(e.target.value); setCurrentPage(1); }}
            placeholder="البحث الذكي بالمستشفى... (اكتب اسم المريض، الرقم الطبي، الطبيب المعالج، أو رقم الجوال)"
            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pr-11 pl-4 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-550/20 focus:border-blue-600 transition-all text-right placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 px-1">نوع العيادة</label>
            <select value={archiveClinicType} onChange={(e) => { setArchiveClinicType(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right cursor-pointer">
              <option value="الكل">جميع العيادات</option>
              <option value="In-Patient">تنويم داخلي (In-Patient)</option>
              <option value="Out-Patient">عيادات خارجية (Out-Patient)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 px-1">طريقة المقابلة</label>
            <select value={archiveInterviewType} onChange={(e) => { setArchiveInterviewType(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right cursor-pointer">
              <option value="الكل">جميع المقابلات</option>
              <option value="Call">مكالمة هاتفية (Call)</option>
              <option value="In Person">مقابلة حضورية (In Person)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 px-1">حالة رضا الزائر</label>
            <select value={archiveSatisfaction} onChange={(e) => { setArchiveSatisfaction(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right cursor-pointer">
              <option value="الكل">الكل</option>
              <option value="Satisfied">راضٍ 😊</option>
              <option value="Unsatisfied">غير راضٍ أو حرجة 🙁</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 px-1">من تاريخ</label>
            <input type="date" value={archiveStartDate} onChange={(e) => { setArchiveStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 px-1">إلى تاريخ</label>
            <input type="date" value={archiveEndDate} onChange={(e) => { setArchiveEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={clearArchiveFilters}
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-slate-200">
            تصفير الفلاتر وإعادة الضبط
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-rose-600">فشل تحميل الاستبيانات</p>
          <p className="text-xs text-rose-500 mt-1">{(error as any)?.message || "خطأ في الشبكة"}</p>
        </div>
      )}

      {/* Loading state for first fetch */}
      {isLoading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Surveys grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-xs transition-all relative overflow-hidden group flex flex-col justify-between space-y-4">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${survey.isSatisfied ? "bg-emerald-500" : "bg-rose-500"}`}></div>

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="text-right">
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{survey.patientName}</h3>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      دخل بتاريخ: {new Date(survey.enterDate).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border ${
                    survey.clinicType === "In-Patient" ? "bg-blue-50 text-blue-700 border-blue-105" : "bg-amber-50 text-amber-700 border-amber-105"
                  }`}>
                    {survey.clinicType === "In-Patient" ? "تنويم داخلي" : "عيادات خارجية"}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">الرقم الطبي:</span>
                    <span className="font-bold text-slate-800">{survey.medicalNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">رقم الهاتف:</span>
                    <span className="font-bold text-slate-800" dir="ltr">{survey.phoneNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">الغرفة/القسم:</span>
                    <span className="font-medium text-slate-800">{survey.roomNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">الدكتور المعالج:</span>
                    <span className="font-medium text-slate-800">{survey.doctorName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{survey.isSatisfied ? "😊" : "🙁"}</span>
                  <span className={`text-[10px] font-bold ${survey.isSatisfied ? "text-emerald-600" : "text-rose-600"}`}>
                    {survey.isSatisfied ? "راضٍ تماماً" : "غير راضٍ عن الخدمة"}
                  </span>
                </div>

                <button onClick={() => onViewDetail(survey.id)}
                  className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1 group-hover:-translate-x-1 transition-transform duration-200">
                  <span>عرض الإجابات</span>
                  <ChevronLeft size={16} />
                </button>

                {user?.role === "Admin" && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEditSurvey(survey)}
                      className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-[10px] font-bold cursor-pointer">
                      تعديل
                    </button>
                    <button onClick={() => onDeleteSurvey(survey.id)}
                      className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 text-[10px] font-bold cursor-pointer">
                      حذف
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {surveys.length === 0 && (
            <div className="col-span-full bg-white border border-dashed border-slate-200 p-12 rounded-2xl text-center text-slate-400 text-xs font-semibold">
              لا يوجد استبيانات مسجلة تطابق محددات البحث والفواجع التصفيفية المختارة.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center gap-1.5">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer">
              <ChevronRight size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
              <button key={pNum} onClick={() => setCurrentPage(pNum)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-xs transition-all pointer-events-auto cursor-pointer ${
                  currentPage === pNum ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-650 hover:bg-slate-50"
                }`}>
                {pNum}
              </button>
            ))}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer">
              <ChevronLeft size={18} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}