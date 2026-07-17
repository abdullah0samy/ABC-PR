import React, { useState } from "react";
import {
  Plus,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import { useQuestions, useCreateQuestion, useDeleteQuestion } from "../hooks/useQuestions";
import { useCategories, useCreateCategory, useDeleteCategory } from "../hooks/useCategories";
import type { Category } from "../types";

interface Props {
  isEnglish: boolean;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

const DEFAULT_CATEGORIES = ["Medical", "Nursing", "Hospitality", "Security"];

export default function QuestionsPage({ isEnglish, triggerNotification }: Props) {
  const { data: questions = [], isLoading: questionsLoading } = useQuestions();
  const { data: categories = [], isLoading: catsLoading } = useCategories();

  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [activeQuestionTab, setActiveQuestionTab] = useState<number>(1);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionCategory, setNewQuestionCategory] = useState<string>("Medical");
  const [newQuestionPriority, setNewQuestionPriority] = useState<"High" | "Medium" | "Low">("High");
  const [questionToDeleteId, setQuestionToDeleteId] = useState<number | null>(null);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<number | null>(null);
  const [newCatNameAr, setNewCatNameAr] = useState("");
  const [newCatNameEn, setNewCatNameEn] = useState("");

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      triggerNotification("error", "الرجاء كتابة نص السؤال أولاً.");
      return;
    }
    createQuestion.mutate(
      {
        templateId: activeQuestionTab,
        text: newQuestionText,
        category: newQuestionCategory as "Medical" | "Nursing" | "Hospitality" | "Security",
        priority: newQuestionPriority,
      },
      {
        onSuccess: () => {
          setNewQuestionText("");
          setIsQuestionModalOpen(false);
          triggerNotification("success", "تم حفظ السؤال وإضافته للنموذج بنجاح.");
        },
        onError: (err: any) => {
          triggerNotification("error", err.message || "حدث خطأ أثناء إضافة السؤال.");
        },
      },
    );
  };

  const confirmDeleteQuestion = () => {
    if (!questionToDeleteId) return;
    deleteQuestion.mutate(questionToDeleteId, {
      onSuccess: () => {
        triggerNotification("success", isEnglish ? "Question deleted successfully!" : "تم حذف السؤال من النموذج.");
        setQuestionToDeleteId(null);
      },
      onError: (err: any) => {
        triggerNotification("error", err.message || (isEnglish ? "Failed to delete question." : "فشل حذف السؤال."));
        setQuestionToDeleteId(null);
      },
    });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameAr.trim() || !newCatNameEn.trim()) {
      triggerNotification("error", isEnglish ? "Please write the category name in both Arabic and English." : "يرجى كتابة اسم الفئة باللغتين العربية والإنجليزية.");
      return;
    }
    createCategory.mutate(
      { nameEnglish: newCatNameEn.trim(), nameArabic: newCatNameAr.trim() },
      {
        onSuccess: () => {
          triggerNotification("success", isEnglish ? "Category successfully added!" : "تم إضافة الفئة الجديدة بنجاح.");
          setNewCatNameAr("");
          setNewCatNameEn("");
        },
        onError: (err: any) => {
          triggerNotification("error", err.message || (isEnglish ? "Error adding category." : "حدث خطأ أثناء إضافة الفئة."));
        },
      },
    );
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDeleteId) return;
    deleteCategory.mutate(categoryToDeleteId, {
      onSuccess: () => {
        triggerNotification("success", isEnglish ? "Category successfully deleted!" : "تم حذف الفئة بنجاح.");
        setCategoryToDeleteId(null);
      },
      onError: (err: any) => {
        triggerNotification("error", err.message || (isEnglish ? "Error deleting category." : "حدث خطأ أثناء حذف الفئة."));
        setCategoryToDeleteId(null);
      },
    });
  };

  // Pre-fill the new question category from categories
  const availableCategories = categories.length > 0 ? categories : [];
  const resolveCategoryDisplay = (q: any) => {
    const cat = (categories as Category[]).find(
      (c) => c.nameEnglish.toLowerCase() === (q.category || "").toLowerCase(),
    );
    if (cat) return isEnglish ? cat.nameEnglish : cat.nameArabic;
    const fallbacks: Record<string, string> = {
      Medical: isEnglish ? "Medical" : "طبي",
      Nursing: isEnglish ? "Nursing" : "تمريض",
      Hospitality: isEnglish ? "Hospitality" : "ضيافة",
      Security: isEnglish ? "Security" : "أمن",
    };
    return fallbacks[q.category] || q.category;
  };

  if (questionsLoading || catsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800">إدارة قوالب الأسئلة الاستبيانية</h2>
          <p className="text-sm font-medium text-slate-500">تهيئة وتخصيص الأسئلة السريرية والديناميكية لغرف المرضى والعيادات</p>
        </div>

        <button
          type="button"
          onClick={() => setIsQuestionModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer animate-in zoom-in duration-300"
        >
          <Plus size={16} />
          <span>إضافة سؤال جديد للنموذج</span>
        </button>
      </div>

      {/* Template Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl max-w-md flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveQuestionTab(1)}
          className={`flex-1 py-1.5 px-4 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
            activeQuestionTab === 1
              ? "bg-white text-blue-700 shadow-xs border border-slate-205"
              : "text-slate-500 hover:text-slate-805"
          }`}
        >
          قالب تنويم المرضى الداخلي (In-Patient)
        </button>
        <button
          type="button"
          onClick={() => setActiveQuestionTab(2)}
          className={`flex-1 py-1.5 px-4 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
            activeQuestionTab === 2
              ? "bg-white text-blue-700 shadow-xs border border-slate-205"
              : "text-slate-500 hover:text-slate-850"
          }`}
        >
          قالب العيادات الخارجية (Out-Patient)
        </button>
      </div>

      {/* Questions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <h4 className="font-bold text-sm text-slate-800">الأسئلة النشطة في القالب</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#f9f9ff] text-slate-400 font-bold uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">الترتيب</th>
                <th className="px-6 py-4">نص السؤال</th>
                <th className="px-6 py-4">الفئة</th>
                <th className="px-6 py-4">الأهمية</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questions
                .filter((q: any) => q.templateId === activeQuestionTab)
                .map((q: any, idx: number) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#00448c]">{idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 leading-relaxed max-w-sm">{q.text}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 text-[#00448c] font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                        {resolveCategoryDisplay(q)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold text-[10px] ${
                        q.priority === "High" ? "text-rose-600" :
                        q.priority === "Medium" ? "text-amber-600" : "text-slate-400"
                      }`}>
                        {q.priority === "High" ? "مرتفع" : q.priority === "Medium" ? "متوسط" : "منخفض"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setQuestionToDeleteId(q.id)}
                        className="text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                      >
                        حذف من القالب
                      </button>
                    </td>
                  </tr>
                ))}
              {questions.filter((q: any) => q.templateId === activeQuestionTab).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-xs bg-slate-50/50">
                    لا توجد أسئلة نشطة مضافة لهذا القالب بالتفصيل.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Manager Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-bold text-base text-slate-800">
            {isEnglish ? "Manage Custom Evaluation Categories" : "إدارة فئات التقييم الإدارية المخصصة"}
          </h3>
          <p className="text-xs text-slate-550 font-medium mt-1">
            {isEnglish
              ? "Add and delete custom departments to organize template questions and track performance statistics."
              : "إضافة وحذف أقسام مخصصة لربط أسئلة النماذج وتتبع مستويات الأداء والإحصائيات الإدارية بدقة."}
          </p>
        </div>

        <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {isEnglish ? "Category Name (Arabic)" : "اسم الفئة باللغة العربية"}
            </label>
            <input
              type="text"
              className="w-full text-xs h-10 bg-white border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder={isEnglish ? "e.g., الصيدلية" : "مثال: الصيدلية"}
              value={newCatNameAr}
              onChange={(e) => setNewCatNameAr(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-705">
              {isEnglish ? "Category Name (English)" : "اسم الفئة باللغة الإنجليزية"}
            </label>
            <input
              type="text"
              className="w-full text-xs h-10 bg-white border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left"
              placeholder={isEnglish ? "e.g., Pharmacy" : "مثال: Pharmacy"}
              value={newCatNameEn}
              onChange={(e) => setNewCatNameEn(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={createCategory.isPending}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
          >
            <PlusCircle size={14} />
            <span>{isEnglish ? "Add Category" : "إضافة فئة جديدة"}</span>
          </button>
        </form>

        <div className="space-y-3">
          <h4 className="font-bold text-xs text-slate-700">
            {isEnglish ? "Current Active Categories" : "الفئات والأقسام النشطة حالياً"}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat: Category) => {
              const isDefault = DEFAULT_CATEGORIES.includes(cat.nameEnglish);
              return (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all text-right">
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs text-slate-800">{cat.nameArabic}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">{cat.nameEnglish}</p>
                  </div>
                  {isDefault ? (
                    <span className="text-[9px] bg-slate-200/60 text-slate-500 font-bold px-1.5 py-0.5 rounded-md">
                      {isEnglish ? "System Default" : "افتراضي"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCategoryToDeleteId(cat.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title={isEnglish ? "Delete Category" : "حذف الفئة"}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <h3 className="font-black text-sm text-[#0f448c]">إضافة سؤال جديد لقالب {activeQuestionTab === 1 ? "التنويم" : "العيادات"}</h3>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">نص السؤال باللغة العربية</label>
                <textarea
                  required
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="اصل صيغة السؤال التقييمي المباشر للمريض هنا..."
                  className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4 text-xs font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#003c8c]/10 focus:border-[#003c8c] transition-all text-right resize-none placeholder:text-slate-400"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 block">الفئة الإدارية للمقارنة</label>
                  <select
                    value={newQuestionCategory}
                    onChange={(e) => setNewQuestionCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00448c]/15 text-right cursor-pointer"
                  >
                    {availableCategories.map((cat: Category) => (
                      <option key={cat.id} value={cat.nameEnglish}>
                        {cat.nameArabic} - {cat.nameEnglish}
                      </option>
                    ))}
                    {availableCategories.length === 0 && (
                      <>
                        <option value="Medical">طبي - Medical</option>
                        <option value="Nursing">تمريض - Nursing</option>
                        <option value="Hospitality">ضيافة - Hospitality</option>
                        <option value="Security">أمن - Security</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 block">مستوى الأهمية والمقاومة</label>
                  <select
                    value={newQuestionPriority}
                    onChange={(e) => setNewQuestionPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00448c]/15 text-right cursor-pointer"
                  >
                    <option value="High">مرتفع - High</option>
                    <option value="Medium">متوسط - Medium</option>
                    <option value="Low">منخفض - Low</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={createQuestion.isPending}
                  className="flex-1 h-11 bg-[#00448c] hover:bg-[#005bb7] text-white rounded-xl font-bold text-xs shadow cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {createQuestion.isPending ? "جاري الحفظ..." : "حفظ السؤال في القالب"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-5 h-11 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Confirm Modal */}
      {questionToDeleteId !== null && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in duration-200 text-right">
            <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 justify-end">
              <span className="p-1 px-2.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold leading-normal">تنبيه أمان</span>
              <span>تأكيد حذف السؤال من النموذج</span>
            </h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              {isEnglish
                ? "Are you sure you want to delete this question? This action is irreversible."
                : "هل أنت متأكد تماماً من رغبتك في حذف هذا السؤال؟ سيؤدي هذا إلى إزالته الفورية من أي استبيانات مستهدفة قادمة."}
            </p>
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={confirmDeleteQuestion}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                {isEnglish ? "Confirm Delete" : "نعم، احذف السؤال"}
              </button>
              <button
                type="button"
                onClick={() => setQuestionToDeleteId(null)}
                className="h-10 px-5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
              >
                {isEnglish ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirm Modal */}
      {categoryToDeleteId !== null && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in duration-200 text-right">
            <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 justify-end">
              <span className="p-1 px-2.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold leading-normal">تأكيد حذف الفئة</span>
              <span>تأكيد إزالة القسم الإداري</span>
            </h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              {isEnglish
                ? "Are you sure you want to delete this category? Any associated questions might fallback."
                : "هل أنت متأكد من رغبتك في حذف هذا القسم التقييمي المخصص؟ سيؤدي الحذف لتبديل مرجعيات أسئلتها المرتبطة تلقائياً."}
            </p>
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                {isEnglish ? "Delete Now" : "موافق، احذف الفئة"}
              </button>
              <button
                type="button"
                onClick={() => setCategoryToDeleteId(null)}
                className="h-10 px-5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
              >
                {isEnglish ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}