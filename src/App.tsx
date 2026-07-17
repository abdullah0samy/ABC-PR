import { COUNTRIES } from "./constants";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  CheckCircle,
  Sun,
  Moon,
  Globe,
  BarChart3,
  FilePlus2,
  LibraryBig,
  ListChecks,
  MessageSquareQuote,
  Plus,
  PlusCircle,
  Calendar,
  MessageSquare,
  FileText,
  Lock,
  X,
  Smile,
  Frown,
  Meh,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  Info,
  HelpCircle,
  Printer,
  FileSpreadsheet,
  Trash2,
  LayoutDashboard,
  ClipboardPlus,
  FileQuestion,
  MessageCircle,
} from "lucide-react";
import { translations } from "./translations";
import { Logo } from "./components/Logo";
import {
  User as UserType,
  Question,
  Survey,
  SurveyWithSatisfaction,
  SurveyWithDetail,
  WhatsappLog,
  Analytics,
  Category,
} from "./types";
import { api, ApiError, getStoredUser, persistSession, clearSession } from "./api";

export default function App() {
  // Translate helper using our modular translations file
  const [isEnglish, setIsEnglish] = useState<boolean>(() => {
    return localStorage.getItem("pr_system_lang") === "en";
  });
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("pr_system_theme") === "dark";
  });

  const t = (key: keyof typeof translations.ar) => {
    const lang = isEnglish ? "en" : "ar";
    return translations[lang][key] || translations["ar"][key] || key;
  };

  useEffect(() => {
    localStorage.setItem("pr_system_lang", isEnglish ? "en" : "ar");
  }, [isEnglish]);

  useEffect(() => {
    localStorage.setItem("pr_system_theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Authentication states
  const [user, setUser] = useState<UserType | null>(null);
  const [authError, setAuthError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // General App states
  const [activeView, setActiveView] = useState<"dashboard" | "create-survey" | "archive" | "questions" | "whatsapp-logs">("dashboard");
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Analytics states & filter dates
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] = useState<string>("All"); // All or individual category
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");
  const [statsClinicType, setStatsClinicType] = useState("جميع العيادات");

  // Question Management states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionTab, setActiveQuestionTab] = useState<number>(1); // 1 = In-Patient, 2 = Out-Patient
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionCategory, setNewQuestionCategory] = useState<string>("Medical");
  const [newQuestionPriority, setNewQuestionPriority] = useState<"High" | "Medium" | "Low">("High");

  // Custom Categories & Deletions states
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatNameAr, setNewCatNameAr] = useState("");
  const [newCatNameEn, setNewCatNameEn] = useState("");
  const [questionToDeleteId, setQuestionToDeleteId] = useState<number | null>(null);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<number | null>(null);
  const [surveyToEdit, setSurveyToEdit] = useState<Survey | null>(null);
  const [surveyToDeleteId, setSurveyToDeleteId] = useState<number | null>(null);

  const [editPatientName, setEditPatientName] = useState("");
  const [editMedicalNumber, setEditMedicalNumber] = useState("");
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editDoctorName, setEditDoctorName] = useState("");
  const [editInterviewType, setEditInterviewType] = useState<"Call" | "In Person">("Call");
  const [editClinicType, setEditClinicType] = useState<"In-Patient" | "Out-Patient">("In-Patient");
  const [editIsSatisfied, setEditIsSatisfied] = useState(true);
  const [editRecommend, setEditRecommend] = useState<"Yes" | "No">("Yes");

  useEffect(() => {
    if (surveyToEdit) {
      setEditPatientName(surveyToEdit.patientName);
      setEditMedicalNumber(surveyToEdit.medicalNumber);
      setEditRoomNumber(surveyToEdit.roomNumber || "");
      setEditPhoneNumber(surveyToEdit.phoneNumber || "");
      setEditDoctorName(surveyToEdit.doctorName || "");
      setEditInterviewType(surveyToEdit.interviewType);
      setEditClinicType(surveyToEdit.clinicType);
      setEditIsSatisfied(surveyToEdit.isSatisfied);
      setEditRecommend(surveyToEdit.recommend);
    }
  }, [surveyToEdit]);

  // Fetch categories list
  const fetchCategories = async () => {
    try {
      const data = await api.listCategories();
      setCategories(data);
      if (data.length > 0) {
        setNewQuestionCategory(data[0].nameEnglish);
      }
    } catch (err) {
      // silent fail — categories already seeded
    }
  };

  // Add new custom category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameAr.trim() || !newCatNameEn.trim()) {
      return triggerNotification("error", isEnglish ? "Please write the category name in both Arabic and English." : "يرجى كتابة اسم الفئة باللغتين العربية والإنجليزية.");
    }
    try {
      await api.createCategory(newCatNameEn.trim(), newCatNameAr.trim());
      triggerNotification("success", isEnglish ? "Category successfully added!" : "تم إضافة الفئة الجديدة بنجاح.");
      setNewCatNameAr("");
      setNewCatNameEn("");
      fetchCategories();
    } catch (err: any) {
      triggerNotification("error", err.message || (isEnglish ? "Error adding category." : "حدث خطأ أثناء إضافة الفئة."));
    }
  };

  // Delete category
  const confirmDeleteCategory = async () => {
    if (!categoryToDeleteId) return;
    try {
      await api.deleteCategory(categoryToDeleteId);
      triggerNotification("success", isEnglish ? "Category successfully deleted!" : "تم حذف الفئة بنجاح.");
      setCategoryToDeleteId(null);
      fetchCategories();
    } catch (err: any) {
      triggerNotification("error", err.message || (isEnglish ? "Error deleting category." : "حدث خطأ أثناء حذف الفئة."));
    }
  };

  const setQuickRange = (range: "today" | "week" | "month" | "last30" | "all") => {
    const today = new Date();
    const format = (d: Date) => {
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().split("T")[0];
    };

    if (range === "today") {
      const todayStr = format(today);
      setStatsStartDate(todayStr);
      setStatsEndDate(todayStr);
    } else if (range === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 6);
      setStatsStartDate(format(weekAgo));
      setStatsEndDate(format(today));
    } else if (range === "last30") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 29);
      setStatsStartDate(format(thirtyDaysAgo));
      setStatsEndDate(format(today));
    } else if (range === "month") {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStatsStartDate(format(firstOfMonth));
      setStatsEndDate(format(today));
    } else if (range === "all") {
      setStatsStartDate("");
      setStatsEndDate("");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const getCategoryName = (catKey: string) => {
    const cat = categories.find(c => c.nameEnglish.toLowerCase() === catKey.toLowerCase());
    if (cat) {
      return isEnglish ? cat.nameEnglish : cat.nameArabic;
    }
    // Simple Static Fallback Dictionary
    if (catKey === "Medical") return isEnglish ? "Medical" : "طبي";
    if (catKey === "Nursing") return isEnglish ? "Nursing" : "تمريض";
    if (catKey === "Hospitality") return isEnglish ? "Hospitality" : "ضيافة";
    if (catKey === "Security") return isEnglish ? "Security" : "أمن";
    return catKey;
  };

  // Survey Creation form states
  const [patientName, setPatientName] = useState("");
  const [medicalNumber, setMedicalNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("966"); // المملكة العربية السعودية
  const [phoneNumber, setPhoneNumber] = useState("");

  const [doctorName, setDoctorName] = useState("");
  const [enterDate, setEnterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [interviewType, setInterviewType] = useState<"Call" | "In Person">("Call");
  const [clinicType, setClinicType] = useState<"In-Patient" | "Out-Patient">("In-Patient");
  const [isSatisfied, setIsSatisfied] = useState<boolean>(true);
  const [recommend, setRecommend] = useState<"Yes" | "No" | "">("");
  const [surveyRatings, setSurveyRatings] = useState<Record<number, number>>({}); // questionId: score
  const [isSavingSurvey, setIsSavingSurvey] = useState(false);

  // Archive & Pagination states
  const [surveys, setSurveys] = useState<SurveyWithSatisfaction[]>([]);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveClinicType, setArchiveClinicType] = useState("الكل");
  const [archiveInterviewType, setArchiveInterviewType] = useState("الكل");
  const [archiveSatisfaction, setArchiveSatisfaction] = useState("الكل");
  const [archiveStartDate, setArchiveStartDate] = useState("");
  const [archiveEndDate, setArchiveEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSurveysCount, setTotalSurveysCount] = useState(0);

  // WhatsApp logs
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsappLog[]>([]);

  // Detailed Modal view state
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [surveyDetail, setSurveyDetail] = useState<SurveyWithDetail | null>(null);

  // Executive Export Setup states
  const [isExportPdfModalOpen, setIsExportPdfModalOpen] = useState(false);
  const [pdfReportSignee, setPdfReportSignee] = useState("");
  const [pdfReportTitle, setPdfReportTitle] = useState("التقرير الإداري لمؤشرات تجربة المريض وجودة الخدمة");
  const [pdfReportRecommendations, setPdfReportRecommendations] = useState(
    "١. تكثيف جولات المتابعة التمريضية الدورية للمنومين لتعزيز الاستجابة للاحتياجات الأساسية.\n" +
    "٢. تفعيل ورش عمل سريعة لموظفي الخدمات والضيافة للارتقاء بجودة الوجبات الغذائية المدمجة.\n" +
    "٣. متابعة الحالات الحرجة المدرجة ومعالجة ملاحظات المرضى في أسرع وقت لضمان استرداد الرضا."
  );
  const [pdfIncludeCritical, setPdfIncludeCritical] = useState(true);
  const [pdfIncludeDepartmentScores, setPdfIncludeDepartmentScores] = useState(true);

  // Prefill signee with active user name
  useEffect(() => {
    if (user && !pdfReportSignee) {
      setPdfReportSignee(user.name);
    }
  }, [user]);

  // Status message utility helper
  const triggerNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Try authenticating using stored token on load (try/catch for #37)
  useEffect(() => {
    const savedUser = getStoredUser();
    if (savedUser) {
      setUser(savedUser);
      if (savedUser.role === "Agent") {
        setActiveView("create-survey");
      }
    }
  }, []);

  // Fetch critical entities whenever active view changes
  useEffect(() => {
    if (!user) return;
    refreshData();
  }, [user, activeView]);

  // Handle live search refetches & archive pages pagination
  useEffect(() => {
    if (activeView === "archive" && user) {
      fetchArchiveSurveys();
    }
  }, [activeView, archiveSearch, archiveClinicType, archiveInterviewType, archiveSatisfaction, archiveStartDate, archiveEndDate, currentPage]);

  // Reactive Analytics dates updater
  useEffect(() => {
    if (user && user.role !== "Agent" && activeView === "dashboard") {
      fetchAnalytics(statsStartDate, statsEndDate, statsClinicType);
    }
  }, [statsStartDate, statsEndDate, statsClinicType, user, activeView]);

  const refreshData = () => {
    fetchQuestions();
    fetchAnalytics(statsStartDate, statsEndDate, statsClinicType);
    fetchWhatsAppLogs();
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError("الرجاء تعبئة جميع الحقول المطلوبة.");
      return;
    }

    setIsLoggingIn(true);
    setAuthError("");

    try {
      const data = await api.login(username, password);
      persistSession(data.token, data.user);
      setUser(data.user);

      if (data.user.role === "Agent") {
        setActiveView("create-survey");
      } else {
        setActiveView("dashboard");
      }

      triggerNotification("success", `أهلاً بك مجدداً يا ${data.user.name}`);
    } catch (err: any) {
      setAuthError(err.message || "فشل الاتصال بالخادم الرئيسي.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    clearSession();
    setUser(null);
    setUsername("");
    setPassword("");
    setActiveView("dashboard");
  };

  // Load questions
  const fetchQuestions = async () => {
    try {
      const data = await api.listQuestions();
      setQuestions(data);
    } catch (err) {
      // silent
    }
  };

  // Add new question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      triggerNotification("error", "الرجاء كتابة نص السؤال أولاً.");
      return;
    }

    try {
      await api.createQuestion({
        templateId: activeQuestionTab,
        text: newQuestionText,
        category: newQuestionCategory as "Medical" | "Nursing" | "Hospitality" | "Security",
        priority: newQuestionPriority,
      });

      setNewQuestionText("");
      setIsQuestionModalOpen(false);
      fetchQuestions();
      triggerNotification("success", "تم حفظ السؤال وإضافته للنموذج بنجاح.");
    } catch (err: any) {
      triggerNotification("error", err.message || "حدث خطأ أثناء إضافة السؤال.");
    }
  };

  // Delete question
  const handleDeleteQuestion = (id: number) => {
    setQuestionToDeleteId(id);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDeleteId) return;
    try {
      await api.deleteQuestion(questionToDeleteId);
      fetchQuestions();
      triggerNotification("success", isEnglish ? "Question deleted successfully!" : "تم حذف السؤال من النموذج.");
    } catch (err: any) {
      triggerNotification("error", err.message || (isEnglish ? "Failed to delete question." : "فشل حذف السؤال."));
    } finally {
      setQuestionToDeleteId(null);
    }
  };

  // Delete survey
  const handleDeleteSurvey = async (id: number) => {
    try {
      await api.deleteSurvey(id);
      triggerNotification("success", "تم حذف الاستبيان بنجاح.");
      window.location.reload();
    } catch (err: any) {
      triggerNotification("error", err.message);
    }
  };

  // Update survey
  const handleUpdateSurvey = async (id: number, updates: Partial<Survey>) => {
    try {
      await api.updateSurvey(id, updates);
      triggerNotification("success", "تم تحديث الاستبيان بنجاح.");
      setSurveyToEdit(null);
      window.location.reload();
    } catch (err: any) {
      triggerNotification("error", err.message);
    }
  };

  const handleEditSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyToEdit) return;
    handleUpdateSurvey(surveyToEdit.id, {
      patientName: editPatientName,
      medicalNumber: editMedicalNumber,
      roomNumber: editRoomNumber,
      phoneNumber: editPhoneNumber,
      doctorName: editDoctorName,
      interviewType: editInterviewType,
      clinicType: editClinicType,
      isSatisfied: editIsSatisfied,
      recommend: editRecommend,
    });
  };

  // Fetch admin stats
  const fetchAnalytics = async (sDate = statsStartDate, eDate = statsEndDate, cType = statsClinicType) => {
    try {
      const params = new URLSearchParams({ clinicType: cType });
      if (sDate) params.set("startDate", sDate);
      if (eDate) params.set("endDate", eDate);
      const data = await api.analytics(params);
      setAnalytics(data);
    } catch (err) {
      // silent
    }
  };

  // Fetch outbound logs
  const fetchWhatsAppLogs = async () => {
    try {
      const data = await api.whatsappLogs();
      setWhatsappLogs(data);
    } catch (err) {
      // silent
    }
  };

  // Simulate Webhook status updates
  const simulateWebhook = async (logId: string, status: "مرسلة" | "مستلمة" | "تمت القراءة") => {
    try {
      const data = await api.simulateWebhook(logId, status);
      triggerNotification("success", data.message || `تمت محاكاة تحديث الـ Webhook بنجاح إلى (${status})`);
      fetchWhatsAppLogs();
    } catch (err: any) {
      triggerNotification("error", err.message || "حدث خطأ في الشبكة أثناء محاكاة الطلب.");
    }
  };

  // Export satisfaction data to Excel format (CSV with Arabic BOM UTF-8)
  const handleExportExcel = () => {
    if (!analytics) {
      triggerNotification("error", "تحذير: لا توجد بيانات إحصائية محملة لتصديرها.");
      return;
    }

    let csvContent = "";
    
    // Header section
    csvContent += "تقرير مؤشرات قياس رضا المرضى والزوار المعتمد - مستشفى ABC\r\n";
    csvContent += `تاريخ التصدير الدوري,${new Date().toLocaleDateString("ar-SA")}\r\n`;
    csvContent += `إجمالي الاستبيانات المكتملة,${analytics.totalSurveys}\r\n`;
    csvContent += `عدد المرضى الراضين تماماً,${analytics.satisfiedCount}\r\n`;
    csvContent += `عدد حالات الاستبقاء الحرجة,${analytics.unsatisfiedCount}\r\n`;
    csvContent += `النسبة الإجمالية للرضا ومستوى الخدمة,${analytics.overallSatisfactionPercent}%\r\n\r\n`;

    // 1. Department Breakdown Section
    csvContent += "أولاً: أداء ومؤشرات الرضا التفصيلية للأقسام والخدمات\r\n";
    csvContent += "اسم القسم الطبي / الخدمي,الفئة العامة,التقييم الرقمي المتوسط (من 5),نسبة رضا القسم\r\n";
    analytics.departmentStats.forEach((stat) => {
      const catArabic = 
        stat.category === "Medical" ? "طبي" :
        stat.category === "Nursing" ? "تمريض" :
        stat.category === "Hospitality" ? "ضيافة" :
        stat.category === "Security" ? "أمن" : stat.category;
      csvContent += `"${stat.titleArabic}","${catArabic}",${stat.averageScore},${stat.averagePercent}%\r\n`;
    });
    csvContent += "\r\n";

    // 2. Critical Follow-up cases
    csvContent += "ثانياً: الحالات الحرجة المسجلة (حالات الاستبقاء والمستاءين)\r\n";
    csvContent += "الرقم الطبي (MRN),اسم المريض,الطبيب المعالج,تاريخ الدخول,مستوى التوصية بالمستشفى,حالة المتابعة الحالية\r\n";
    analytics.criticalCases.forEach((critical) => {
      csvContent += `"${critical.medicalNumber}","${critical.patientName}","${critical.doctorName}","${critical.enterDate}","${critical.recommend}","${critical.followupStatus || 'قيد العمل'}"\r\n`;
    });
    csvContent += "\r\n";

    // 3. Raw Patient Feedback Responses List with computed satisfaction %
    csvContent += "ثالثاً: تفاصيل سجلات المرضى والاستجابات الفردية الكاملة\r\n";
    csvContent += "رقم السجل,الرقم الطبي (MRN),اسم المريض,الطبيب الرسم,نوع الجولة,نوع الخدمة,تاريخ التقييم,نسبة الرضا %,الحالة المعتمدة\r\n";
    
    surveys.forEach((s) => {
      const clinicArabic = s.clinicType === "In-Patient" ? "تنويم داخلي" : "عيادات خارجية";
      const interviewArabic = s.interviewType === "Call" ? "هاتفي" : "حضوري";
      const satisfiedText = s.isSatisfied ? "راضي" : "غير راضي (حرج)";
      // s.satisfactionPercentage is now computed by the backend on Archive listing.
      csvContent += `${s.id},"${s.medicalNumber}","${s.patientName}","${s.doctorName}","${interviewArabic}","${clinicArabic}","${s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-SA") : ''}",${s.satisfactionPercentage ?? 0}%,"${satisfiedText}"\r\n`;
    });

    // Generate blob with exact standard UTF-8 Byte Order Mark (BOM)
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `تقرير_إحصائيات_ABC_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerNotification("success", "تم تصدير ملف إحصائيات الرضا بصيغة Excel متوافقة مع اللغة العربية بنجاح.");
  };

  // Fetch detailed single survey
  const loadSurveyDetail = async (id: number) => {
    try {
      const data = await api.surveyDetail(id);
      setSurveyDetail(data);
      setSelectedSurveyId(id);
    } catch (err: any) {
      triggerNotification("error", err.message || "فشل تحميل تفاصيل التقييم.");
    }
  };

  // Fetch surveys paginated archive
  const fetchArchiveSurveys = async () => {
    try {
      const queryParams = new URLSearchParams({
        search: archiveSearch,
        clinicType: archiveClinicType,
        interviewType: archiveInterviewType,
        satisfaction: archiveSatisfaction,
        startDate: archiveStartDate,
        endDate: archiveEndDate,
        page: currentPage.toString(),
        limit: "20"
      });

      const data = await api.archive(queryParams);
      setSurveys(data.surveys);
      setTotalPages(data.pagination.totalPages);
      setTotalSurveysCount(data.pagination.totalCount);
    } catch (err) {
      // silent
    }
  };

  // Smart Evaluation Tracking Matrix
  // If ratings contain 2 or more negative scores (1 or 2), auto flip general state to Unsatisfied
  const handleRateQuestion = (questionId: number, score: number) => {
    const updatedRatings = { ...surveyRatings, [questionId]: score };
    setSurveyRatings(updatedRatings);

    // Count poor evaluations (score <= 2)
    const poorRatingsCount = Object.values(updatedRatings).filter((rating) => Number(rating) <= 2).length;

    if (poorRatingsCount >= 2) {
      setIsSatisfied(false);
    } else {
      setIsSatisfied(true);
    }
  };

  // Reset core survey variables
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

  // Survey submission
  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();

    // Field basic validations
    if (!patientName.trim()) return triggerNotification("error", "يرجى كتابة اسم المريض بالكامل.");
    if (!medicalNumber.trim()) return triggerNotification("error", "يرجى كتابة الرقم الطبي للمريض.");
    if (!phoneNumber.trim() || phoneNumber.length < 5) return triggerNotification("error", "يرجى كتابة رقم هاتف فعال للتغذية الراجعة والواتساب.");
    if (!doctorName.trim()) return triggerNotification("error", "يرجى تحديد اسم الطبيب المعالج.");
    if (recommend === "") return triggerNotification("error", "يرجى الإجابة على سؤال الـ NPS (هل ترشح المستشفى؟).");

    // Ensure all visible template questions are answered
    const visibleQuestions = questions.filter(
      (q) => q.templateId === (clinicType === "In-Patient" ? 1 : 2)
    );
    const unanswered = visibleQuestions.filter((q) => !surveyRatings[q.id]);
    if (unanswered.length > 0) {
      return triggerNotification("error", "يرجى الإجابة على جميع أسئلة التقييم أولاً.");
    }

    setIsSavingSurvey(true);

    try {
      const answersPayload = Object.entries(surveyRatings).map(([qId, score]) => ({
        questionId: parseInt(qId),
        score
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
        answers: answersPayload
      };

      const data = await api.createSurvey(payload);

      triggerNotification("success", isEnglish ? "Survey successfully submitted!" : "تم حفظ وإرسال استبيان المريض بنجاح.");
      resetSurveyForm();
      refreshData();

      // Redirect view based on user roles
      if (user?.role === "Agent") {
        setActiveView("archive");
      } else {
        setActiveView("dashboard");
      }
    } catch (err: any) {
      triggerNotification("error", err.message || (isEnglish ? "An unexpected error occurred." : "حدث خطأ غير متوقع أثناء حفظ التقييم."));
    } finally {
      setIsSavingSurvey(false);
    }
  };

  // Quick reset filters helper
  const clearArchiveFilters = () => {
    setArchiveClinicType("الكل");
    setArchiveInterviewType("الكل");
    setArchiveSatisfaction("الكل");
    setArchiveStartDate("");
    setArchiveEndDate("");
    setArchiveSearch("");
    setCurrentPage(1);
  };

  // Filter dynamic department scores for chart
  const getIsolatedStats = () => {
    if (!analytics) return [];
    if (analyticsCategoryFilter === "All") {
      return analytics.departmentStats;
    }
    return analytics.departmentStats.filter((itm) => itm.titleArabic === analyticsCategoryFilter || itm.category === analyticsCategoryFilter);
  };

  // Render Login Panel if unauthorized
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 selection:bg-blue-100 relative overflow-hidden font-sans transition-colors duration-200 ${isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`} dir={isEnglish ? "ltr" : "rtl"}>
        {/* Top Floating Language and Theme bar for the login page */}
        <div className="absolute top-6 right-6 left-6 flex justify-end items-center gap-2">
          {/* Theme Toggler */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-amber-400 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
            title={isDarkMode ? "الوضع المضيء" : "الوضع الداكن"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {/* Language Switcher */}
          <button
            onClick={() => setIsEnglish(!isEnglish)}
            className="px-3 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
            title={isEnglish ? "العربية" : "English"}
          >
            <Globe size={14} />
            <span>{isEnglish ? "AR" : "EN"}</span>
          </button>
        </div>

        <div className="w-full max-w-[420px] space-y-6 animate-in fade-in duration-500">
          {/* Logo & Medical Branding */}
          <div className="text-center space-y-4 flex flex-col items-center">
            <Logo size="lg" showText={false} />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white flex items-center justify-center gap-2">
                <span className="text-[#986435] dark:text-[#eedaa2]">ABC</span>
                <span className="text-slate-500 dark:text-slate-300">Hospital</span>
              </h1>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-1">PR System</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t("loginSubtitle")}</p>
            </div>
          </div>

          {/* Core Login Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEnglish ? "Authorized Personnel Sign In" : "تسجيل الدخول للموظفين المعتمدين"}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {isEnglish ? "Please enter your administrative or agent account keys to proceed." : "الرجاء إدخال بيانات حساب العلاقات أو الإدارة المعين للوصول للبوابة."}
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 text-red-700 dark:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 px-1" htmlFor="username">{t("usernameLabel")}</label>
                <div className="relative">
                  <span className={`absolute inset-y-0 ${isEnglish ? "left-4" : "right-4"} flex items-center text-slate-400 pointer-events-none`}>
                    <User size={18} />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    dir="ltr"
                    className={`w-full h-12 bg-slate-50 dark:bg-slate-850 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl ${isEnglish ? "pl-12 pr-4 text-left" : "pr-12 pl-4 text-right"} text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all placeholder:text-slate-400`}
                    placeholder="admin / manager / agent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 px-1" htmlFor="password">{t("passwordLabel")}</label>
                <div className="relative">
                  <span className={`absolute inset-y-0 ${isEnglish ? "left-4" : "right-4"} flex items-center text-slate-400 pointer-events-none`}>
                    <Lock size={18} />
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className={`w-full h-12 bg-slate-50 dark:bg-slate-850 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl ${isEnglish ? "pl-12 pr-4 text-left" : "pr-12 pl-4 text-right"} text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all placeholder:text-slate-400`}
                    placeholder="123"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{isEnglish ? "Authenticating..." : "جاري التحقق..."}</span>
                  </>
                ) : (
                  <span>{t("loginBtn")}</span>
                )}
              </button>
            </form>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t("loginWarning")}</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={`min-h-screen text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-105 antialiased transition-colors duration-200 ${isDarkMode ? "dark bg-slate-950" : "bg-slate-50"}`} dir={isEnglish ? "ltr" : "rtl"}>
      {/* Toast Notification HUD */}
      {notification && (
        <div className="fixed top-6 left-6 z-[200] max-w-sm animate-in slide-in-from-left duration-300">
          <div className={`p-4 rounded-xl shadow-md border flex items-center gap-3 ${
            notification.type === "success" 
              ? "bg-emerald-600 border-emerald-500 text-white" 
              : "bg-rose-600 border-rose-500 text-white"
          }`}>
            {notification.type === "success" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span className="text-xs font-semibold">{notification.text}</span>
          </div>
        </div>
      )}

      {/* Global Top Platform Bar */}
      <header className="h-16 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-8 sticky top-0 z-[100] flex items-center justify-between flex-shrink-0">
        {/* Brand Signet */}
        <Logo size="sm" showText={true} />

        {/* Global Patient Prompt Search on top bar (Manager/Admins) */}
        {user.role !== "Agent" && (
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8 relative">
            <span className={`absolute inset-y-0 ${isEnglish ? "left-3" : "right-3"} flex items-center text-slate-400 pointer-events-none`}>
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={archiveSearch}
              onChange={(e) => {
                setArchiveSearch(e.target.value);
                setActiveView("archive"); // auto-redirect to archival table searching results
              }}
              className={`bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2 ${isEnglish ? "pl-10 pr-4 text-left" : "pr-10 pl-4 text-right"} text-xs w-full focus:bg-slate-100 dark:focus:bg-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-805 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none`}
            />
          </div>
        )}

        {/* Dynamic Switchers & User Profile Indicator */}
        <div className="flex items-center gap-4">
          {/* Theme & Language switchers toolbar */}
          <div className="flex items-center gap-1.5 border-r dark:border-slate-800 pr-4">
            {/* Theme Toggler */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? (isEnglish ? "Light Mode" : "الوضع المضيء") : (isEnglish ? "Dark Mode" : "الوضع الداكن")}
              className="w-9 h-9 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setIsEnglish(!isEnglish)}
              title={isEnglish ? "العربية" : "English"}
              className="w-16 h-9 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 text-[10px] font-bold border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
            >
              <Globe size={13} />
              <span>{isEnglish ? "العربية" : "EN"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 border-r dark:border-slate-850 pr-4">
            <div className="text-right leading-none hidden sm:block">
              <p className="text-sm font-bold text-slate-850 dark:text-white">{user.name}</p>
              <p className="text-[10px] text-blue-600 bg-blue-50 dark:bg-slate-800 dark:text-blue-300 px-2 rounded-full font-medium inline-block mt-1">
                {user.role === "Admin" ? t("roleAdmin") : user.role === "Manager" ? t("roleManager") : t("roleAgent")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-205 flex items-center justify-center text-slate-600 text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Quick Outbound Action on screen header */}
          <button
            onClick={handleLogout}
            title={isEnglish ? "Log Out" : "تسجيل الخروج"}
            className="w-10 h-10 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Structural Layout split */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* Navigation Sidebar Drawer for desktop screens */}
        <aside className="hidden lg:flex flex-col bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 w-64 pt-8 p-4 shrink-0 space-y-6">
          <h3 className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
            {t("systemNavTitle")}
          </h3>
          <nav className="space-y-1">
            {/* Admin/Manager Tab - Analytics */}
            {user.role !== "Agent" && (
              <button
                onClick={() => { setActiveView("dashboard"); refreshData(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs leading-none transition-all cursor-pointer ${
                  activeView === "dashboard"
                    ? "bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <BarChart3 size={18} className={activeView === "dashboard" ? "text-blue-700 dark:text-blue-300" : "text-slate-500"} />
                <span>{t("tabDashboard")}</span>
              </button>
            )}

            {/* Agent/Admin Tab - Create Survey */}
            {user.role !== "Manager" && (
              <button
                onClick={() => setActiveView("create-survey")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs leading-none transition-all cursor-pointer ${
                  activeView === "create-survey"
                    ? "bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-805 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FilePlus2 size={18} className={activeView === "create-survey" ? "text-blue-700 dark:text-blue-300" : "text-slate-500"} />
                <span>{t("tabCreateSurvey")}</span>
              </button>
            )}

            {/* All Roles Tab - Survey Archive */}
            <button
              onClick={() => setActiveView("archive")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs leading-none transition-all cursor-pointer ${
                activeView === "archive"
                  ? "bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-805 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LibraryBig size={18} className={activeView === "archive" ? "text-blue-700 dark:text-blue-300" : "text-slate-500"} />
              <span>{t("tabArchive")}</span>
              {surveys.length > 0 && (
                <span className={`mr-auto px-2 py-0.5 text-[9px] rounded-full font-bold ${
                  activeView === "archive" ? "bg-blue-200/50 text-blue-800 dark:bg-slate-700 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-800 text-slate-605 dark:text-slate-400"
                }`}>
                  {totalSurveysCount || surveys.length}
                </span>
              )}
            </button>

            {/* Admin Only Tab - Questions Template */}
            {user.role === "Admin" && (
              <button
                onClick={() => { setActiveView("questions"); fetchQuestions(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs leading-none transition-all cursor-pointer ${
                  activeView === "questions"
                    ? "bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-805 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ListChecks size={18} className={activeView === "questions" ? "text-blue-700 dark:text-blue-300" : "text-slate-500"} />
                <span>{t("tabQuestions")}</span>
              </button>
            )}

            {/* Admin/Manager Tab - WhatsApp Logs */}
            {user.role !== "Agent" && (
              <button
                onClick={() => { setActiveView("whatsapp-logs"); fetchWhatsAppLogs(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs leading-none transition-all cursor-pointer ${
                  activeView === "whatsapp-logs"
                    ? "bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-805 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MessageSquareQuote size={18} className={activeView === "whatsapp-logs" ? "text-blue-700 dark:text-blue-300" : "text-slate-500"} />
                <span>{t("tabWhatsapp")}</span>
                {whatsappLogs.length > 0 && (
                  <span className={`mr-auto px-2 py-0.5 text-[9px] rounded-full font-bold ${
                    activeView === "whatsapp-logs" ? "bg-blue-200/50 text-blue-800 dark:bg-slate-700 dark:text-slate-200" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                  }`}>
                    {whatsappLogs.length}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Quick System Statistics Panel widget inside sidebar */}
          <div className="mt-auto p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider mb-2">
              {isEnglish ? "TECHNICAL PLATFORM HEALTH" : "الحالة التقنية للمنظومة"}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("systemOkIndicator")}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("agentIndicator")}</span>
            </div>
            <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-normal font-medium mt-1 border-t border-slate-200/50 dark:border-slate-820 pt-1">
              {isEnglish 
                ? "Evolution Active Webhooks automatically monitor unhappy scores." 
                : "بوابة Evolution API تعمل تلقائياً للتحذيرات الفورية."}
            </p>
          </div>
        </aside>

        {/* Core Canvas Content wrapper */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-28 lg:pb-12">
          
          {/* ========================================== */}
          {/* VIEW: DASHBOARD (ADMIN & MANAGER)          */}
          {/* ========================================== */}
          {activeView === "dashboard" && user.role !== "Agent" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Header Title & Date Prompt */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-2 no-print">
                <div>
                  <h2 className="text-2xl font-bold text-slate-50 dark:text-white">لوحة تقارير وإحصائيات الرضا</h2>
                  <p className="text-sm font-medium text-slate-400">مراقبة التغذية الراجعة المرضية الحية لغرف التنويم والعيادات</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-white text-slate-600 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold shadow-xs">
                    <Calendar size={15} className="text-[#00448c]" />
                    <span>توقيت النظام المعتمد: {new Date().toLocaleDateString("ar-SA", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  
                  {/* Export Options */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportExcel}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all duration-200 hover:shadow-md cursor-pointer active:scale-95 text-center"
                      title="تحميل البيانات وصيغ الرضا بملف Excel متوافق مع اللغة العربية"
                    >
                      <FileSpreadsheet size={15} />
                      <span>تصدير إكسل (Excel)</span>
                    </button>
                    <button
                      onClick={() => setIsExportPdfModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-[#00448c] hover:bg-opacity-95 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all duration-200 hover:shadow-md cursor-pointer active:scale-95 text-center"
                      title="إنشاء تقرير إداري مفصل وتصديره لملف PDF فوري"
                    >
                      <Printer size={15} />
                      <span>تنزيل تقرير إداري (PDF)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Time Period & Segment Filter Block */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-4 no-print transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block"></span>
                    <h3 className="font-bold text-xs text-slate-800 dark:text-white">{t("filterByDate")}</h3>
                  </div>
                  <span className="text-[10px] text-slate-401 dark:text-slate-400 font-semibold">{isEnglish ? "Instant interactive update of all clinical charts & insights" : "تحديث فوري وتفاعلي لكافة المخططات والمؤشرات السريرية"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  {/* Start Date filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-410 block">{t("startDate")}</label>
                    <input
                      type="date"
                      value={statsStartDate}
                      onChange={(e) => setStatsStartDate(e.target.value)}
                      className="w-full text-xs h-10 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl px-3 focus:bg-white dark:focus:bg-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold cursor-pointer text-center"
                    />
                  </div>

                  {/* End Date filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-410 block">{t("endDate")}</label>
                    <input
                      type="date"
                      value={statsEndDate}
                      onChange={(e) => setStatsEndDate(e.target.value)}
                      className="w-full text-xs h-10 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl px-3 focus:bg-white dark:focus:bg-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold cursor-pointer text-center"
                    />
                  </div>

                  {/* Clinic Type filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-410 block">{isEnglish ? "Service & Clinic Type" : "نوع الخدمة والعيادة"}</label>
                    <select
                      value={statsClinicType}
                      onChange={(e) => setStatsClinicType(e.target.value)}
                      className="w-full text-xs h-10 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl px-3 focus:bg-white dark:focus:bg-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold cursor-pointer text-center"
                    >
                      <option value="الكل" className="dark:bg-slate-900">{isEnglish ? "All Services (الكل)" : "جميع الخدمات المتاحة (الكل)"}</option>
                      <option value="In-Patient" className="dark:bg-slate-900">{isEnglish ? "In-Patient (تنويم)" : "القسم الداخلي - غرف التنويم"}</option>
                      <option value="Out-Patient" className="dark:bg-slate-900">{isEnglish ? "Out-Patient (عيادات)" : "القسم الخارجي - العيادات"}</option>
                    </select>
                  </div>

                  {/* Action Filters controller */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStatsStartDate("");
                        setStatsEndDate("");
                        setStatsClinicType("الكل");
                        triggerNotification("success", isEnglish ? "Filters successfully reset!" : "تم إعادة تعيين مرشحات الفترة الزمنية.");
                      }}
                      className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 hover:shadow-xs active:scale-95"
                    >
                      <span>{t("resetFilters")}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Period Selection Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-450">{t("quickPeriods")}:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickRange("today");
                      triggerNotification("success", isEnglish ? "Filtered for today!" : "تم التصفية لتاريخ اليوم!");
                    }}
                    className={`px-3 py-1 bg-blue-50 hover:bg-blue-100/80 dark:bg-slate-800 text-blue-700 dark:text-blue-300 dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700 rounded-full text-[10px] font-bold transition-all cursor-pointer active:scale-95`}
                  >
                    {t("todayLabel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickRange("week");
                      triggerNotification("success", isEnglish ? "Filtered for this week!" : "تم التصفية للأيام السبعة الأخيرة!");
                    }}
                    className={`px-3 py-1 bg-blue-50 hover:bg-blue-100/80 dark:bg-slate-800 text-blue-700 dark:text-blue-300 dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700 rounded-full text-[10px] font-bold transition-all cursor-pointer active:scale-95`}
                  >
                    {t("last7Days")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickRange("last30");
                      triggerNotification("success", isEnglish ? "Filtered for last 30 days!" : "تم التصفية للثلاثين يوماً الأخيرة!");
                    }}
                    className={`px-3 py-1 bg-blue-50 hover:bg-blue-100/80 dark:bg-slate-800 text-blue-700 dark:text-blue-300 dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700 rounded-full text-[10px] font-bold transition-all cursor-pointer active:scale-95`}
                  >
                    {t("last30Days")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickRange("month");
                      triggerNotification("success", isEnglish ? "Filtered for this month!" : "تم التصفية لبداية الشهر الحالي!");
                    }}
                    className={`px-3 py-1 bg-blue-50 hover:bg-blue-100/80 dark:bg-slate-800 text-blue-700 dark:text-blue-300 dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700 rounded-full text-[10px] font-bold transition-all cursor-pointer active:scale-95`}
                  >
                    {isEnglish ? "This Month" : "الشهر الحالي"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickRange("all");
                      triggerNotification("success", isEnglish ? "Showing all-time records!" : "عرض السجلات لكافة الأوقات!");
                    }}
                    className={`px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-700 rounded-full text-[10px] font-bold transition-all cursor-pointer active:scale-95`}
                  >
                    {t("allTime")}
                  </button>
                </div>
              </div>

              {/* Aggregated Counters Bento Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText size={22} />
                  </div>
                  <div className="text-right leading-none">
                    <span className="block text-slate-400 text-[10px] font-bold mb-1">إجمالي التقييمات</span>
                    <span className="text-2xl font-bold text-slate-800">{analytics?.totalSurveys || surveys.length}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Smile size={22} />
                  </div>
                  <div className="text-right leading-none">
                    <span className="block text-slate-400 text-[10px] font-bold mb-1">المرضى الراضين</span>
                    <span className="text-2xl font-bold text-emerald-600">{analytics?.satisfiedCount || surveys.filter(s => s.isSatisfied).length}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Frown size={22} />
                  </div>
                  <div className="text-right leading-none">
                    <span className="block text-slate-400 text-[10px] font-bold mb-1">استبقاءات حرجة</span>
                    <span className="text-2xl font-bold text-rose-600">{analytics?.unsatisfiedCount || surveys.filter(s => !s.isSatisfied).length}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <MessageSquare size={22} />
                  </div>
                  <div className="text-right leading-none">
                    <span className="block text-slate-400 text-[10px] font-bold mb-1">تنبيهات واتساب صادرة</span>
                    <span className="text-2xl font-bold text-amber-600">{whatsappLogs.length}</span>
                  </div>
                </div>
              </div>

              {/* Live Visualization: Gauge + Bar Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Overall Gauge Chart Display (4 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
                  <h3 className="text-xs font-bold text-slate-500 tracking-wider">مؤشر الرضا التراكمي العام</h3>
                  
                  {/* Custom CSS Hand-Tailored Dial Gauge */}
                  <div className="relative w-56 h-28 overflow-hidden flex items-end justify-center">
                    <div className="absolute top-0 w-56 h-56 rounded-full border-[22px] border-slate-100"></div>
                    <div 
                      className="absolute top-0 w-56 h-56 rounded-full border-[22px] border-transparent border-b-blue-600 border-l-blue-600 transition-transform duration-1000 ease-out"
                      style={{
                        transform: `rotate(${Math.min(180, Math.max(0, ((analytics?.overallSatisfactionPercent || 87) / 100) * 180 + 45))}deg)`
                      }}
                    ></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-1.5 z-10 space-y-0.5">
                      <span className="text-4xl font-bold text-slate-800 leading-none">{analytics?.overallSatisfactionPercent || 87}%</span>
                      <span className="text-[10px] font-semibold text-blue-600">نسبة الرضا الإجمالية</span>
                    </div>
                  </div>

                  <div className="flex gap-6 text-[10px] font-bold text-slate-500 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                      <span>راضي تماماً</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-slate-200 rounded-full"></span>
                      <span>مستاء / متأخر</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">النسبة مبنية على تجميع وتقييم الاستبيانات النشطة لجميع الأقسام الطبية للـ 30 يوماً الماضية.</p>
                </div>

                {/* Categories Bar Chart & Dynamic Dropdown Filter (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">مقارنة الرضا حسب الفئات الطبية والضيافة</h3>
                      <p className="text-[10px] text-slate-400 font-bold">عزل وتحليل أداء كل قسم بشكل مستقل</p>
                    </div>
                    
                    {/* Advanced Dropdown filter for Chart Category isolation */}
                    <div className="relative shrink-0">
                      <SlidersHorizontal size={14} className="absolute right-3 top-2.5 text-slate-550 pointer-events-none" />
                      <select
                        value={analyticsCategoryFilter}
                        onChange={(e) => setAnalyticsCategoryFilter(e.target.value)}
                        className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 pr-8 pl-5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-right cursor-pointer"
                      >
                        <option value="All">جميع الأقسام</option>
                        <option value="Medical">طبي - Medical</option>
                        <option value="Nursing">تمريض - Nursing</option>
                        <option value="Hospitality">ضيافة - Hospitality</option>
                        <option value="Security">أمن - Security</option>
                      </select>
                    </div>
                  </div>

                  {/* Render simulated dynamic scale bar graph chart */}
                  <div className="space-y-4 pt-2">
                    {getIsolatedStats().map((stat, i) => (
                      <motion.div 
                        key={i} 
                        className="space-y-1.5"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{stat.titleArabic} ({stat.category})</span>
                          <span className="font-bold text-blue-600">{stat.averageScore} / 5 ({stat.averagePercent}%)</span>
                        </div>
                        <motion.div 
                          className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative group"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              stat.averagePercent >= 80 ? "bg-blue-600" :
                              stat.averagePercent >= 60 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${stat.averagePercent}%` }}
                          ></div>
                          {/* Interactive Tooltip */}
                          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] rounded px-2 py-1 -top-8 left-0 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                            {stat.titleArabic} ({stat.category}): {stat.totalAnswersCount} إجابة ({stat.averagePercent}%)
                          </div>
                        </motion.div>
                      </motion.div>
                    ))}
                    <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                        <span>عالي (80%+)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                        <span>متوسط (60%+)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                        <span>منخفض</span>
                      </div>
                    </div>
                    {getIsolatedStats().length === 0 && (
                      <div className="text-center py-12 text-slate-400 text-xs font-medium">البيانات غير متوفرة لهذا التصفيف المختار.</div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] leading-relaxed text-slate-500 font-medium">
                    * يتم احتساب المتوسط العام الحسابي المرجح تلقائياً من إجابات الأسئلة الديناميكية المسجلة لكل فئة.
                  </div>
                </div>
              </div>

              {/* Critical Unsatisfied Alerts Table (Manager Action Trigger) */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span>جدول الحالات الحرجة والمستاءة (تتطلب تدخل فوري)</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">قائمة المرضى المسجلين كـ "غير راضٍ" أو لا يوصون بالمستشفى لمتابعة الشكاوى</p>
                  </div>
                  <button 
                    onClick={() => { clearArchiveFilters(); setArchiveSatisfaction("Unsatisfied"); setActiveView("archive"); }}
                    className="shrink-0 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg border border-blue-100 cursor-pointer active:scale-95 transition-all"
                  >
                    عرض كامل الحالات المتأثرة
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-550 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">الرقم الطبي</th>
                        <th className="px-6 py-4">اسم المريض المستاء</th>
                        <th className="px-6 py-4">الطبيب المعالج</th>
                        <th className="px-6 py-4">تاريخ الزيارة</th>
                        <th className="px-6 py-4">التوصية بالعائلة</th>
                        <th className="px-6 py-4">حالة الاستبيان</th>
                        <th className="px-6 py-4 text-center">تفاصيل الشكوى</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {(analytics?.criticalCases || []).map((patient, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{patient.medicalNumber}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{patient.patientName}</td>
                          <td className="px-6 py-4 text-slate-500 font-medium">{patient.doctorName}</td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {new Date(patient.enterDate).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 py-0.5 px-2 rounded-full border border-rose-100">
                              <ThumbsDown size={12} />
                              لا يرشح المستشفى
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-rose-50 text-rose-700 font-bold px-2.5 py-1 rounded-full text-[10px] border border-rose-100 animate-pulse">حرجة جداً</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => loadSurveyDetail(patient.id)}
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              عرض التفاصيل والاعتذار
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(analytics?.criticalCases || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                            ممتاز! لا يوجد أي حالات مستاءة أو حرجة معلقة حالياً في المستشفى.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW: CREATE SURVEY FORM (AGENT & ADMIN)   */}
          {/* ========================================== */}
          {activeView === "create-survey" && user.role !== "Manager" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Header Titles */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-800">نموذج تقييم جديد لرضا الزوار</h2>
                <p className="text-sm font-medium text-slate-500">يرجى تسجيل كافة البيانات المطلوبة للمريض بصدق وموضوعية أثناء المقابلة</p>
              </div>

              <form onSubmit={handleSubmitSurvey} className="space-y-6">
                
                {/* Section 1: Patient Data Grid Header */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600"></div>
                  
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <User className="text-blue-600" size={18} />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">أولاً: البيانات الأساسية للمريض</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Patient Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">اسم المريض بالكامل</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: أحمد محمد علي"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Medical Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">الرقم الطبي للمريض (MRN)</label>
                      <input
                        type="text"
                        required
                        placeholder="MRN-XXXXX"
                        value={medicalNumber}
                        onChange={(e) => setMedicalNumber(e.target.value)}
                        className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">رقم الهاتف الفعال (مع رمز الدولة)</label>
                      <div className="flex gap-2">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-2 text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-slate-800 dark:text-white cursor-pointer"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              +{c.code} ({c.name})
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          required
                          placeholder="5XXXXXXXX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="flex-1 h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Room Number / Clinic Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">رقم الغرفة / اسم العيادة الخارجية</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: جناح 402-A أو عيادة الأطفال"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Doctor Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">اسم الدكتور المشرف المعالج</label>
                      <input
                        type="text"
                        required
                        placeholder="د. خالد حسن"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Date auto-pulated */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">تاريخ المقابلة / الإدخال</label>
                      <input
                        type="date"
                        required
                        value={enterDate}
                        onChange={(e) => setEnterDate(e.target.value)}
                        className="w-full h-11 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-right text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Clinical selectors & parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Interview Parameters Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 tracking-wider">محددات المقابلة والعيادات</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 mb-1.5">طريقة المقابلة التقييمية</span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setInterviewType("Call")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              interviewType === "Call"
                                ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          >
                            مكالمة هاتفية (Call)
                          </button>
                          <button
                            type="button"
                            onClick={() => setInterviewType("In Person")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              interviewType === "In Person"
                                ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          >
                            مقابلة حضورية (In Person)
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 mb-1.5">فئة ونوع العيادات المزارة</span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => { setClinicType("In-Patient"); setSurveyRatings({}); }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              clinicType === "In-Patient"
                                ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          >
                            تنويم داخلي (In-Patient)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setClinicType("Out-Patient"); setSurveyRatings({}); }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              clinicType === "Out-Patient"
                                ? "bg-white dark:bg-slate-700 text-blue-750 dark:text-blue-300 shadow-xs border border-blue-105 dark:border-blue-900"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          >
                            عيادات خارجية (Out-Patient)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Smart Satisfaction Live State toggle */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-2">الحالة العامة لرضا المريض</h3>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">يتم احتساب الحالة ومتابعتها تلقائياً بناءً على إجابات الأسئلة التفصيلية لإفادة الإدارة العليا والاعتذار الفوري عند الاقتضاء.</p>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors mt-4 ${
                      isSatisfied 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300" 
                        : "bg-rose-50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/60 text-rose-800 dark:text-rose-300"
                    }`}>
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        {isSatisfied ? <Smile size={20} className="text-emerald-600" /> : <Frown size={20} className="text-rose-600" />}
                        <span>{isSatisfied ? "المريض راضٍ عن جودة الخدمات" : "المريض مستاء / غير راضٍ (تنبيه)"}</span>
                      </span>

                      {/* Interactive Manual Override Switch */}
                      <button
                        type="button"
                        onClick={() => setIsSatisfied(!isSatisfied)}
                        className={`w-14 h-8 rounded-full transition-all relative overflow-hidden flex items-center cursor-pointer ${
                          isSatisfied ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      >
                        <span className={`w-6 h-6 bg-white rounded-full shadow-xs absolute top-1 transition-all ${
                          isSatisfied ? "left-1" : "left-7"
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 3: Dynamic Template Questions list with Big Emojis */}
                <div className="bg-white border border-slate-205 p-6 rounded-2xl shadow-xs space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <HelpCircle className="text-blue-600" size={18} />
                    <h3 className="text-sm font-bold text-slate-800">ثانياً: أسئلة التقييم التفصيلية للفئة</h3>
                  </div>

                  {/* Load visible questions filtered by selection */}
                  <div className="space-y-4">
                    {questions
                      .filter((q) => q.templateId === (clinicType === "In-Patient" ? 1 : 2))
                      .map((q, qIndex) => (
                        <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-xs font-semibold text-slate-800 leading-normal">
                              {qIndex + 1}. {q.text}
                            </p>
                            <span className="bg-slate-200/60 text-slate-600 font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase shrink-0">
                              {q.category === "Medical" ? "طبي" : q.category === "Nursing" ? "تمريض" : q.category === "Hospitality" ? "ضيافة" : "أمن"}
                            </span>
                          </div>

                          {/* 5-scale emoji button selectors */}
                          <div className="flex items-center justify-between max-w-lg mx-auto bg-white p-3 rounded-xl border border-slate-200">
                            {[
                              { score: 1, label: "سيء جداً", emoji: "😡" },
                              { score: 2, label: "سيء", emoji: "😟" },
                              { score: 3, label: "متوسط", emoji: "😐" },
                              { score: 4, label: "جيد", emoji: "🙂" },
                              { score: 5, label: "ممتاز", emoji: "🤩" }
                            ].map((scale) => {
                              const isActive = surveyRatings[q.id] === scale.score;
                              return (
                                <button
                                  key={scale.score}
                                  type="button"
                                  onClick={() => handleRateQuestion(q.id, scale.score)}
                                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all grow cursor-pointer ${
                                    isActive 
                                      ? "bg-blue-50 border border-blue-200 scale-105 shadow-xs" 
                                      : "hover:bg-slate-50 border border-transparent text-slate-400"
                                  }`}
                                >
                                  <span className="text-2xl filter drop-shadow-sm">{scale.emoji}</span>
                                  <span className={`text-[9px] font-semibold ${isActive ? "text-blue-700" : "text-slate-400"}`}>
                                    {scale.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* General NPS question "Would recommend the hospital?" */}
                  <div className="border-t border-slate-100 pt-6 space-y-3">
                    <div className="text-right leading-relaxed">
                      <p className="text-xs font-semibold text-slate-800">
                        مؤشر صافي الترويج للمنشأة الطبية (NPS) / هل توصي بالمستشفى لأصدقائك أو عائلتك عند الحاجة؟
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">مؤشر أساسي لتقييم ولاء وثقة الزوار للخدمة والمرفق</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRecommend("Yes");
                        }}
                        className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs border transition-all cursor-pointer ${
                          recommend === "Yes"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <ThumbsUp size={16} />
                        <span>نعم، بالتأكيد (أوصي بشدة)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRecommend("No");
                          setIsSatisfied(false);
                        }}
                        className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs border transition-all cursor-pointer ${
                          recommend === "No"
                            ? "bg-rose-50 border-rose-500 text-rose-800"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <ThumbsDown size={16} />
                        <span>لا، لا أوصي بالمنشأة</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Panel Actions */}
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSavingSurvey}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 select-none active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSavingSurvey ? (
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

                  <button
                    type="button"
                    onClick={resetSurveyForm}
                    className="h-12 px-6 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-xs cursor-pointer transition-all active:scale-95"
                  >
                    مسح البيانات والبدء مجدداً
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW: ARCHIVE GRID & SEARCH FILTER LIST    */}
          {/* ========================================== */}
          {activeView === "archive" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Archive Title */}
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

              {/* Advanced Real-Time Search & Multiple Quick Filters Bar */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                
                {/* Search Bar Input */}
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

                {/* Sub Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                  {/* Clinic Type selective dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 px-1">نوع العيادة</label>
                    <select
                      value={archiveClinicType}
                      onChange={(e) => { setArchiveClinicType(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right cursor-pointer"
                    >
                      <option value="الكل">جميع العيادات</option>
                      <option value="In-Patient">تنويم داخلي (In-Patient)</option>
                      <option value="Out-Patient">عيادات خارجية (Out-Patient)</option>
                    </select>
                  </div>

                  {/* Interview Type selective dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 px-1">طريقة المقابلة</label>
                    <select
                      value={archiveInterviewType}
                      onChange={(e) => { setArchiveInterviewType(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right cursor-pointer"
                    >
                      <option value="الكل">جميع المقابلات</option>
                      <option value="Call">مكالمة هاتفية (Call)</option>
                      <option value="In Person">مقابلة حضورية (In Person)</option>
                    </select>
                  </div>

                  {/* Satisfaction Filter selective dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 px-1">حالة رضا الزائر</label>
                    <select
                      value={archiveSatisfaction}
                      onChange={(e) => { setArchiveSatisfaction(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right cursor-pointer"
                    >
                      <option value="الكل">الكل</option>
                      <option value="Satisfied">راضٍ 😊</option>
                      <option value="Unsatisfied">غير راضٍ أو حرجة 🙁</option>
                    </select>
                  </div>

                  {/* Custom Date Range Picker: Start Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 px-1">من تاريخ</label>
                    <input
                      type="date"
                      value={archiveStartDate}
                      onChange={(e) => { setArchiveStartDate(e.target.value); setCurrentPage(1); }}
                      className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right"
                    />
                  </div>

                  {/* Custom Date Range Picker: End Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 px-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={archiveEndDate}
                      onChange={(e) => { setArchiveEndDate(e.target.value); setCurrentPage(1); }}
                      className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-right"
                    />
                  </div>
                </div>

                {/* Actions reset row */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={clearArchiveFilters}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-slate-200"
                  >
                    تصفير الفلاتر وإعادة الضبط
                  </button>
                </div>
              </div>

              {/* Surveys Grid Card mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {surveys.map((survey) => {
                  return (
                    <div
                      key={survey.id}
                      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-xs transition-all relative overflow-hidden group flex flex-col justify-between space-y-4"
                    >
                      {/* Left vertical visual color code key */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${
                        survey.isSatisfied ? "bg-emerald-500" : "bg-rose-500"
                      }`}></div>

                      {/* Card Header information */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="text-right">
                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{survey.patientName}</h3>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                              دخل بتاريخ: {new Date(survey.enterDate).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>
                          
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border ${
                            survey.clinicType === "In-Patient"
                              ? "bg-blue-50 text-blue-700 border-blue-105"
                              : "bg-amber-50 text-amber-700 border-amber-105"
                          }`}>
                            {survey.clinicType === "In-Patient" ? "تنويم داخلي" : "عيادات خارجية"}
                          </span>
                        </div>

                        {/* Patient descriptive fields */}
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

                      {/* Card Footer status actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl">{survey.isSatisfied ? "😊" : "🙁"}</span>
                          <span className={`text-[10px] font-bold ${
                            survey.isSatisfied ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {survey.isSatisfied ? "راضٍ تماماً" : "غير راضٍ عن الخدمة"}
                          </span>
                        </div>

                        <button 
                          onClick={() => loadSurveyDetail(survey.id)}
                          className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1 group-hover:-translate-x-1 transition-transform duration-200"
                        >
                          <span>عرض الإجابات</span>
                          <ChevronLeft size={16} />
                        </button>
                        
                        {user?.role === "Admin" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSurveyToEdit(survey)}
                              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-[10px] font-bold cursor-pointer"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => setSurveyToDeleteId(survey.id)}
                              className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 text-[10px] font-bold cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {surveys.length === 0 && (
                  <div className="col-span-full bg-white border border-dashed border-slate-200 p-12 rounded-2xl text-center text-slate-400 text-xs font-semibold">
                    لا يوجد استبيانات مسجلة تطابق محددات البحث والفواجع التصفيفية المختارة.
                  </div>
                )}
              </div>

              {/* Archive Pagination HUD */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <nav className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-xs transition-all pointer-events-auto cursor-pointer ${
                          currentPage === pNum
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-650 hover:bg-slate-50"
                        }`}
                      >
                        {pNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </nav>
                </div>
              )}

            </div>
          )}

          {/* ========================================== */}
          {/* VIEW: QUESTION CRUD TEMPLATES (ADMIN ONLY) */}
          {/* ========================================== */}
          {activeView === "questions" && user.role === "Admin" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Question Manager Title */}
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

              {/* Split template Tabs */}
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

              {/* Template Visible questions table list */}
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
                        .filter((q) => q.templateId === activeQuestionTab)
                        .map((q, idx) => (
                          <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-[#00448c]">{idx + 1}</td>
                            <td className="px-6 py-4 font-semibold text-slate-700 leading-relaxed max-w-sm">{q.text}</td>
                            <td className="px-6 py-4">
                              <span className="bg-blue-50 text-[#00448c] font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                                {q.category === "Medical" ? "طبي" : q.category === "Nursing" ? "تمريض" : q.category === "Hospitality" ? "ضيافة" : "أمن"}
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
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                              >
                                حذف من القالب
                              </button>
                            </td>
                          </tr>
                        ))}
                      {questions.filter((q) => q.templateId === activeQuestionTab).length === 0 && (
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
                    className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
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
                    {categories.map((cat) => {
                      const isDefault = ["Medical", "Nursing", "Hospitality", "Security"].includes(cat.nameEnglish);
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

            </div>
          )}

          {/* ========================================== */}
          {/* VIEW: WHATSAPP MESSAGES LOG (ADMIN & MGR)  */}
          {/* ========================================== */}
          {activeView === "whatsapp-logs" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* WhatsApp Logs Title */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-slate-800">سجلات إشعارات الـ WhatsApp الفورية</h2>
                  <p className="text-sm font-medium text-slate-500">تتبع حي ومباشر لكافة رسائل الاعتذار المؤتمتة عبر بوابة Evolution API</p>
                </div>
                <div className="text-xs font-semibold text-slate-600 bg-white py-2 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  <span>العدد الإجمالي للجلسة: {whatsappLogs.length} إشعار ذكي</span>
                </div>
              </div>

              {/* Webhook Configuration and Simulation Guide Info Panel */}
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
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp/webhook`);
                      triggerNotification("success", "تم نسخ رابط الـ Webhook إلى الحافظة.");
                    }}
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

              {/* Logs Table Card */}
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
                      {whatsappLogs.map((log) => (
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
                                  {/* Latency Display */}
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
                              
                              {/* Webhook Quick Action Simulation Buttons */}
                              <div className="flex items-center justify-center gap-1 mt-1 w-full border-t border-slate-100 pt-1.5">
                                <button
                                  onClick={() => simulateWebhook(log.id, "مستلمة")}
                                  className="px-2 py-1 text-[9.5px] font-bold text-sky-700 bg-white hover:bg-sky-50 rounded border border-sky-100 transition-colors cursor-pointer active:scale-95 flex-1 text-center"
                                  title="محاكاة حدث استلام الرسالة"
                                >
                                  استلام ✓✓
                                </button>
                                <button
                                  onClick={() => simulateWebhook(log.id, "تمت القراءة")}
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
                      {whatsappLogs.length === 0 && (
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
          )}

        </main>
      </div>

      {/* ========================================== */}
      {/* GLOBAL READ-ONLY DETAILED MODAL VIEWER     */}
      {/* ========================================== */}
      {selectedSurveyId !== null && surveyDetail !== null && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header bar */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="text-right">
                <h3 className="font-black text-sm text-[#0F172A] leading-tight">ملف التغذية الراجعة والشكوى للمريض</h3>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">الرقم الطبي: {surveyDetail.survey.medicalNumber}</span>
              </div>
              <button
                onClick={() => { setSelectedSurveyId(null); setSurveyDetail(null); }}
                className="w-10 h-10 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-red-100 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs">
              
              {/* Dynamic Warning Alert if Unsatisfied */}
              {!surveyDetail.survey.isSatisfied && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[#ba1a1a] flex items-start gap-3">
                  <AlertTriangle size={20} className="shrink-0 text-[#ba1a1a] mt-0.5 animate-bounce" />
                  <div className="space-y-1 text-right">
                    <p className="font-black">مريض مستاء - تتطلب التواصل الفوري السريع</p>
                    <p className="text-[10.5px] font-medium leading-relaxed leading-medium text-red-750">
                      قامت أتمتة الـ Evolution API المتصلة بإصدار نموذج رسالة الاعتذار وتثبيت إشعار بالرقم الطبي لحل الشكوى في العلاقات العاصمة فوراً.
                    </p>
                  </div>
                </div>
              )}

              {/* Patient Core summary fields box */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block">اسم المريض المستعلم</span>
                  <span className="font-black text-slate-800 text-sm block">{surveyDetail.survey.patientName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block">رقم وتفاصيل الاتصال</span>
                  <span className="font-extrabold text-slate-800 text-sm block" dir="ltr">+{surveyDetail.survey.phoneNumber}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block">رقم الغرفة أو العيادة الخارجية</span>
                  <span className="font-medium text-slate-800 block text-sm">{surveyDetail.survey.roomNumber}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block">الطبيب المعالج والمتابع الطبي</span>
                  <span className="font-medium text-slate-800 block text-sm">{surveyDetail.survey.doctorName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block">تاريخ المقابلة</span>
                  <span className="font-medium text-slate-800 block text-sm">
                    {new Date(surveyDetail.survey.enterDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block">طريقة ونوع المقابلة</span>
                  <span className="font-extrabold text-[#00448c] block text-sm">
                    {surveyDetail.survey.interviewType === "Call" ? "مكالمة هاتفية (Call)" : "مقابلة حضورية داخل المستشفى"}
                  </span>
                </div>
              </div>

              {/* Survey evaluation scores list highlighted in bright comforting blue tone */}
              <div className="space-y-4">
                <h4 className="font-black text-slate-700 block">إجابات استبيان رضا الزائر المحددة:</h4>
                <div className="space-y-3">
                  {surveyDetail.answers.map((ans, idx) => (
                    <div key={ans.id} className="p-3.5 bg-sky-50/50 border border-sky-100 rounded-2xl flex items-center justify-between gap-4">
                      <p className="font-bold text-slate-800 leading-normal">
                        {idx + 1}. {ans.questionText}
                      </p>
                      
                      {/* Comforting Bright Blue highlighting score badges */}
                      <span className="bg-[#00448c] text-white font-extrabold px-3 py-1 rounded-full text-xs text-center whitespace-nowrap grow-0 shrink-0 select-none shadow">
                        التقييم: {ans.score} / 5
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation answer info */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-right">
                  <p className="text-slate-400 font-bold">صافي مؤشر ترويج الزائر (NPS)</p>
                  <p className="font-black text-slate-800 mt-0.5">هل يرشح المورد/المستشفى لأهله وأقربائه؟</p>
                </div>

                <span className={`px-4 py-2 rounded-2xl font-black ${
                  surveyDetail.survey.recommend === "Yes"
                    ? "bg-emerald-50 text-[#10B981] border border-emerald-150"
                    : "bg-red-50 text-[#ba1a1a] border border-red-150"
                }`}>
                  {surveyDetail.survey.recommend === "Yes" ? "نعم، بكل تأكيد" : "لا ينطق بالتوصية"}
                </span>
              </div>

            </div>

            {/* Modal Bottom bar */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => { setSelectedSurveyId(null); setSurveyDetail(null); }}
                className="bg-[#00448c] text-white px-6 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer hover:bg-[#005bb7] active:scale-95 shadow"
              >
                إغلاق ملف التقييم
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* GLOBAL CREATE QUESTION MODAL (ADMIN ONLY)  */}
      {/* ========================================== */}
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
                  placeholder="اكتب صيغة السؤال التقييمي المباشر للمريض هنا..."
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
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.nameEnglish}>
                        {cat.nameArabic} - {cat.nameEnglish}
                      </option>
                    ))}
                    {categories.length === 0 && (
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
                  className="flex-1 h-11 bg-[#00448c] hover:bg-[#005bb7] text-white rounded-xl font-bold text-xs shadow cursor-pointer transition-all active:scale-[0.98]"
                >
                  حفظ السؤال في القالب
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

      {/* ========================================== */}
      {/* CONFIRM QUESTION DELETE MODAL              */}
      {/* ========================================== */}
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

      {/* ========================================== */}
      {/* CONFIRM CATEGORY DELETE MODAL              */}
      {/* ========================================== */}
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

      {/* ========================================== */}
      {/* CONFIRM SURVEY DELETE MODAL (ADMIN ONLY)   */}
      {/* ========================================== */}
      {surveyToDeleteId !== null && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs animate-in fade-in duration-200" role="dialog">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in duration-200 text-right">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 justify-end">
              <span className="p-1 px-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold leading-normal">تنبيه أمان</span>
              <span>تأكيد حذف الاستبيان</span>
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEnglish 
                ? "Are you sure you want to delete this survey? This action is irreversible and will remove all scores." 
                : "هل أنت متأكد تماماً من رغبتك في حذف هذا الاستبيان بالكامل؟ هذا الإجراء لا يمكن التراجع عنه وسيمحو كافة استجابات الرضا والدرجات المرتبطة به."}
            </p>
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  handleDeleteSurvey(surveyToDeleteId);
                  setSurveyToDeleteId(null);
                }}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                {isEnglish ? "Confirm Delete" : "نعم، احذف الاستبيان"}
              </button>
              <button
                type="button"
                onClick={() => setSurveyToDeleteId(null)}
                className="h-10 px-5 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer transition-all"
              >
                {isEnglish ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* GLOBAL EDIT SURVEY MODAL (ADMIN ONLY)      */}
      {/* ========================================== */}
      {surveyToEdit !== null && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm animate-in fade-in duration-200" role="dialog">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-850/70">
              <h3 className="font-black text-sm text-[#00448c] dark:text-blue-400">تعديل بيانات الاستبيان #{surveyToEdit.id}</h3>
              <button
                type="button"
                onClick={() => setSurveyToEdit(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSurveySubmit} className="p-6 overflow-y-auto space-y-4 text-right">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">اسم المريض</label>
                  <input
                    type="text"
                    required
                    value={editPatientName}
                    onChange={(e) => setEditPatientName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">الرقم الطبي (MRN)</label>
                  <input
                    type="text"
                    required
                    value={editMedicalNumber}
                    onChange={(e) => setEditMedicalNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">رقم الغرفة / العيادة</label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">رقم الهاتف</label>
                  <input
                    type="text"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">اسم الطبيب المعالج</label>
                <input
                  type="text"
                  value={editDoctorName}
                  onChange={(e) => setEditDoctorName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">طريقة المقابلة</label>
                  <select
                    value={editInterviewType}
                    onChange={(e) => setEditInterviewType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="Call">اتصال هاتف - Call</option>
                    <option value="In Person">حضوري بالكامل - In Person</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">نوع الحالة والعيادة</label>
                  <select
                    value={editClinicType}
                    onChange={(e) => setEditClinicType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="In-Patient">تنويم داخلي - In-Patient</option>
                    <option value="Out-Patient">عيادات خارجية - Out-Patient</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">حالة الرضا العامة</label>
                  <select
                    value={editIsSatisfied ? "true" : "false"}
                    onChange={(e) => setEditIsSatisfied(e.target.value === "true")}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="true">راضي - Satisfied</option>
                    <option value="false">غير راضي (حالة حرجة) - Unsatisfied</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">التوصية بالمستشفى</label>
                  <select
                    value={editRecommend}
                    onChange={(e) => setEditRecommend(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="Yes">نعم، يوصي - Yes</option>
                    <option value="No">لا يوصي - No</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 h-11 bg-[#00448c] hover:bg-[#005bb7] text-white rounded-xl font-bold text-xs shadow cursor-pointer transition-all active:scale-[0.98]"
                >
                  حفظ تعديلات الاستبيان
                </button>
                <button
                  type="button"
                  onClick={() => setSurveyToEdit(null)}
                  className="px-5 h-11 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EXECUTIVE PDF REPORT GENERATOR CONFIG MODAL */}
      {/* ========================================== */}
      {isExportPdfModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm animate-in zoom-in-95 duration-200" role="dialog">
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header bar */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="text-right flex items-center gap-2">
                <div className="p-2 bg-[#00448c]/10 text-[#00448c] rounded-lg">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#0F172A] leading-tight">تجهيز وتخصيص التقرير الإداري (PDF)</h3>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">صياغة وتعديل محتوى تقرير مؤشرات الرضا قبل الطباعة والتصدير</span>
                </div>
              </div>
              <button
                onClick={() => setIsExportPdfModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors flex items-center justify-center cursor-pointer border border-transparent active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">عنوان التقرير الرسمي</label>
                <input
                  type="text"
                  required
                  value={pdfReportTitle}
                  onChange={(e) => setPdfReportTitle(e.target.value)}
                  placeholder="مثال: التقرير الإداري الدوري لمؤشرات تجربة المريض..."
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#003c8c]/5 focus:border-[#003c8c] transition-all text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 block">اسم مُعدّ التقرير (الموقّع السُفلي)</label>
                  <input
                    type="text"
                    required
                    value={pdfReportSignee}
                    onChange={(e) => setPdfReportSignee(e.target.value)}
                    placeholder="اسم المسؤول الموقّع..."
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#003c8c]/5 focus:border-[#003c8c] transition-all text-right"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 block">المظروف والتاريخ</label>
                  <div className="w-full bg-slate-100/50 border border-slate-150 text-slate-500 rounded-xl p-3 text-xs font-bold text-center">
                    {new Date().toLocaleDateString("ar-SA", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">التوصيات والملاحظات الإدارية (تظهر مباشرة في ملف PDF)</label>
                <textarea
                  rows={4}
                  value={pdfReportRecommendations}
                  onChange={(e) => setPdfReportRecommendations(e.target.value)}
                  placeholder="اكتب التوصيات الموجهة للإدارة الطبية أو المشرفين هنا..."
                  className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#003c8c]/5 focus:border-[#003c8c] transition-all text-right resize-none custom-scrollbar"
                />
              </div>

              <div className="space-y-3 bg-slate-50/70 p-4 border border-slate-150 rounded-2xl">
                <h4 className="text-xs font-extrabold text-slate-700 mb-1">خيارات وهيكلة تصدير التقرير:</h4>
                
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pdfIncludeDepartmentScores}
                    onChange={(e) => setPdfIncludeDepartmentScores(e.target.checked)}
                    className="w-4.5 h-4.5 text-[#00448c] border-slate-300 rounded focus:ring-[#00448c]/30 cursor-pointer"
                  />
                  <div className="text-xs font-bold text-slate-600">تضمين مؤشرات ومتوسط الرضا التراكمي لجميع الأقسام الطبية والخدمية بالجدول التفصيلي.</div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none" style={{ marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={pdfIncludeCritical}
                    onChange={(e) => setPdfIncludeCritical(e.target.checked)}
                    className="w-4.5 h-4.5 text-[#00448c] border-slate-300 rounded focus:ring-[#00448c]/30 cursor-pointer"
                  />
                  <div className="text-xs font-bold text-slate-600">تضمين جدول الحالات الحرجة المفتوحة التي تتطلب استجابة أو متابعة وتوصيات عاجلة.</div>
                </label>
              </div>

              <div className="bg-blue-50/40 border border-blue-100 p-3.5 rounded-xl text-[11px] leading-relaxed text-blue-800 flex items-start gap-2 font-medium">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>ملاحظة تقنية حول ملفات PDF المضمّنة:</strong> لتجنب مشاكل تقطع الأحرف العربية المعكوسة التي تسببها مكتبات الجافاسكريبت المعتادة، نستخدم محرك المتصفح عالي الجودة للتحويل إلى PDF. عند النقر على "إنشاء وطباعة"، سيفتح مربع الحوار الرسمي لنظامك، يرجى اختيار <strong>"حفظ كملف PDF" (Save as PDF)</strong> وتضمين خلفيات الرسومات للحصول على نتائج ملونة وأنيقة.
                </div>
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                onClick={() => {
                  if (!analytics) {
                    triggerNotification("error", isEnglish ? "No statistics data is available to generate report. Please wait." : "خطأ: لا تتوفر بيانات إحصائية كافية لتوليد التقرير حالياً. يرجى الانتظار لحين تحميل البيانات.");
                    return;
                  }
                  setIsExportPdfModalOpen(false);
                  setTimeout(() => {
                    window.print();
                  }, 300);
                }}
                className="flex-1 h-11 bg-[#00448c] hover:bg-[#005aae] text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                <span>إنشاء وتوليد التقرير المطبوع / PDF</span>
              </button>
              <button
                onClick={() => setIsExportPdfModalOpen(false)}
                className="px-5 h-11 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
              >
                إلغاء الأمر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* HIGH-FIDELITY PRINT-ONLY REPORT FOR PDF    */}
      {/* ========================================== */}
      <div className="print-only p-8 space-y-8 bg-white text-slate-900 border-none">
        
        {/* Official Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
          <div className="text-right space-y-1 text-right">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">مُستشفى نُزول تِك للأعمال الرقمية</h1>
            <p className="text-[10px] text-slate-500 font-bold">إدارة الجودة وتطوير مؤشرات الخدمات الصحية وتجربة المريض</p>
            <p className="text-[9px] text-slate-400">تقارير حية مستمدة من النظام الحركي الإلكتروني الموحد</p>
          </div>
          
          <div className="text-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="text-lg font-black text-slate-800">نُزول HOSPITAL</div>
            <div className="text-[8px] tracking-widest text-[#00448c] font-black uppercase">EXPERIENCE REPORT</div>
          </div>

          <div className="text-left space-y-0.5 text-[10px] font-bold text-slate-500">
            <div>تاريخ الإصدار: <span className="font-semibold text-slate-800">{new Date().toLocaleDateString("ar-SA", { year: 'numeric', month: 'numeric', day: 'numeric' })}</span></div>
            <div>مُعِدّ التقرير: <span className="font-semibold text-slate-800">{pdfReportSignee || user?.name}</span></div>
            <div>حالة التقرير: <span className="font-semibold text-rose-700">سري وموثّق للإدارة</span></div>
          </div>
        </div>

        {/* Customized Title Panel */}
        <div className="text-center py-4 bg-slate-50 border border-slate-150 rounded-2xl">
          <h2 className="text-lg font-black text-slate-800">{pdfReportTitle}</h2>
          <p className="text-[11px] text-slate-500 font-bold mt-1">تراكم ومستخلص أداء جودة الرعاية واستجابات تجربة المريض</p>
        </div>

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 border rounded-xl bg-slate-50 text-center">
              <div className="text-[10px] text-slate-500 font-bold">إجمالي الاستبيانات</div>
              <div className="text-xl font-black text-slate-900">{analytics.totalSurveys}</div>
            </div>
            <div className="p-4 border rounded-xl bg-emerald-50 text-center">
              <div className="text-[10px] text-emerald-700 font-bold">حالات الرضا الكلي</div>
              <div className="text-xl font-black text-emerald-900">{analytics.satisfiedCount}</div>
            </div>
            <div className="p-4 border rounded-xl bg-rose-50 text-center">
              <div className="text-[10px] text-rose-700 font-bold">حالات الاستبقاء الحرجة</div>
              <div className="text-xl font-black text-rose-900">{analytics.unsatisfiedCount}</div>
            </div>
            <div className="p-4 border rounded-xl bg-blue-50 text-center">
              <div className="text-[10px] text-blue-700 font-bold">نسبة الرضا العامة</div>
              <div className="text-xl font-black text-blue-900">{analytics.overallSatisfactionPercent}%</div>
            </div>
          </div>
        )}

        {/* General KPIs Counters Block */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-r-4 border-[#00448c] pr-2.5 text-right">أولاً: ملخص مؤشرات الأداء الحيوية والرضا العام</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center">
              <span className="block text-[10px] font-bold text-slate-450 mb-1">إجمالي التقييمات</span>
              <span className="text-xl font-black text-slate-800">{analytics?.totalSurveys || surveys.length}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center">
              <span className="block text-[10px] font-bold text-slate-450 mb-1">نسبة الرضا العامة</span>
              <span className="text-xl font-black text-blue-700">{analytics?.overallSatisfactionPercent || 87}%</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center">
              <span className="block text-[10px] font-bold text-slate-450 mb-1">المرضى الراضين تماماً</span>
              <span className="text-xl font-black text-emerald-600">{analytics?.satisfiedCount || surveys.filter(s => s.isSatisfied).length}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center">
              <span className="block text-[10px] font-bold text-slate-450 mb-1">حالات الاستبقاء الحرجة</span>
              <span className="text-xl font-black text-rose-600">{analytics?.unsatisfiedCount || surveys.filter(s => !s.isSatisfied).length}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Department / Category Performance (if selected) */}
        {pdfIncludeDepartmentScores && analytics?.departmentStats && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-r-4 border-[#00448c] pr-2.5 text-right">ثانياً: أداء وجودة رضا خدمات الأقسام الطبية والضيافة</h3>
            <table className="w-full text-right text-[10px] border-collapse" style={{ width: "100%", textAlign: "right" }}>
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="px-4 py-2.5 font-black text-slate-700 text-right">القسم الطبي أو الخدمي</th>
                  <th className="px-4 py-2.5 font-black text-slate-700 text-right">فئة القياس</th>
                  <th className="px-4 py-2.5 font-black text-slate-700 text-center">المتوسط الرقمي (من ٥)</th>
                  <th className="px-4 py-2.5 font-black text-slate-700 text-left">مستوى رضا القسم المئوي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {analytics.departmentStats.map((stat, i) => {
                  const catArabic = 
                    stat.category === "Medical" ? "طبي" :
                    stat.category === "Nursing" ? "تمريض" :
                    stat.category === "Hospitality" ? "ضيافة" :
                    stat.category === "Security" ? "أمن" : stat.category;
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-800 font-extrabold text-right">{stat.titleArabic}</td>
                      <td className="px-4 py-2 text-slate-500 font-semibold text-right">{catArabic}</td>
                      <td className="px-4 py-2 text-center font-bold text-slate-700">{stat.averageScore}</td>
                      <td className="px-4 py-2 text-left font-black text-[#00448c]">{stat.averagePercent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Unresolved / Critical cases Table (if selected) */}
        {pdfIncludeCritical && analytics?.criticalCases && analytics.criticalCases.length > 0 && (
          <div className="space-y-3 page-break-before">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-r-4 border-rose-600 pr-2.5 text-right">ثالثاً: ملخص تنبيهات الحالات الحرجة المسجلة (حالات الاستبقاء العاجلة)</h3>
            <table className="w-full text-right text-[9.5px] border-collapse" style={{ width: "100%", textAlign: "right" }}>
              <thead>
                <tr className="bg-rose-50 border-b border-rose-200">
                  <th className="px-3 py-2 font-bold text-rose-900 text-right">الرقم الطبي (MRN)</th>
                  <th className="px-3 py-2 font-bold text-rose-900 text-right">اسم المريض الفني</th>
                  <th className="px-3 py-2 font-bold text-rose-900 text-right">الطبيب المعالج</th>
                  <th className="px-3 py-2 font-bold text-rose-900 text-right">تاريخ الزيارة</th>
                  <th className="px-3 py-2 font-bold text-rose-900 text-center">التوصية بالمستشفى</th>
                  <th className="px-3 py-2 font-bold text-rose-900 text-left">الحالة التنفيذية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {analytics.criticalCases.map((critical, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-extrabold text-slate-650 text-right">{critical.medicalNumber}</td>
                    <td className="px-3 py-2 text-slate-850 font-bold text-right">{critical.patientName}</td>
                    <td className="px-3 py-2 text-slate-500 font-medium text-right">{critical.doctorName}</td>
                    <td className="px-3 py-2 text-slate-450 font-semibold text-right">{critical.enterDate}</td>
                    <td className="px-3 py-2 text-center text-rose-600 font-extrabold">{critical.recommend}</td>
                    <td className="px-3 py-2 text-left text-slate-700 font-bold">{critical.followupStatus || "قيد المراجعة والحل"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes & Dynamic Administrative Recommendations */}
        <div className="space-y-3 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-r-4 border-[#00448c] pr-2.5 text-right">رابعاً: التوصيات المذكورة والملاحظات التنفيذية</h3>
          <p className="text-[10px] text-slate-705 leading-relaxed whitespace-pre-wrap font-bold text-right text-slate-800">
            {pdfReportRecommendations || "يرجى الالتزام بمتابعة أداء الجودة للأقسام ذات المؤشرات المنخفضة بشكل فوري لضمان تطبيق أفضل المعايير وصناعة تجربة مريض متميزة."}
          </p>
        </div>

        {/* Signatures & Approval Lines block */}
        <div className="pt-12 text-slate-800" style={{ marginTop: "40px" }}>
          <div className="grid grid-cols-3 gap-6 text-center text-[10px] font-bold">
            <div className="space-y-6">
              <span className="block border-b border-dashed border-slate-300 pb-2 mb-1">مُعِدّ التقرير واستخلاص الأرقام</span>
              <span className="block text-slate-800 font-black">{pdfReportSignee || user?.name}</span>
              <span className="block text-[8.5px] text-slate-400 font-semibold mt-0.5">قسم علاقات المرضى وتجربة المريض</span>
            </div>
            <div className="space-y-6">
              <span className="block border-b border-dashed border-slate-300 pb-2 mb-1">المدير الطبي العام للمستشفى</span>
              <span className="block text-slate-300">________________________</span>
              <span className="block text-[8.5px] text-slate-400 font-semibold mt-0.5">الاعتماد والتوقيع الرسمي</span>
            </div>
            <div className="space-y-6">
              <span className="block border-b border-dashed border-slate-300 pb-2 mb-1">مدير إدارة الجودة والمتابعة</span>
              <span className="block text-slate-300">________________________</span>
              <span className="block text-[8.5px] text-slate-400 font-semibold mt-0.5">الاعتماد والتوقيع الرسمي</span>
            </div>
          </div>
        </div>

        {/* Small Footer Info */}
        <div className="pt-8 border-t border-slate-100 text-[8px] text-slate-400 font-bold text-center flex justify-between" style={{ marginTop: "30px", borderTop: "1px solid #e2e8f0" }}>
          <span>تم توليد التقرير تلقائياً عبر منصة نُزول الرقمية الحية لمراقبة الرضا العام بمستشفى نزول تك الإلكتروني.</span>
          <span>صفحة ١ من ١</span>
        </div>
      </div>

      {/* Floating Bottom Nav HUD Bar (Responsive Touch Screens & Tablets Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-150 flex justify-around items-center px-4 py-3 pb-safe bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-xl rounded-t-3xl">
        {/* Home option */}
        {user.role !== "Agent" && (
          <button
            onClick={() => { setActiveView("dashboard"); refreshData(); }}
            className={`flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              activeView === "dashboard" ? "text-[#00448c] dark:text-blue-400 font-black" : "text-slate-400 dark:text-slate-505 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[9px] font-bold mt-1">{t("tabDashboard")}</span>
          </button>
        )}

        {/* Survey creation option */}
        {user.role !== "Manager" && (
          <button
            onClick={() => setActiveView("create-survey")}
            className={`flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              activeView === "create-survey" ? "text-[#00448c] dark:text-blue-400 font-black" : "text-slate-400 dark:text-slate-505 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <ClipboardPlus size={20} />
            <span className="text-[9px] font-bold mt-1">{t("tabCreateSurvey")}</span>
          </button>
        )}

        {/* Archival search option */}
        <button
          onClick={() => setActiveView("archive")}
          className={`flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
            activeView === "archive" ? "text-[#00448c] dark:text-blue-400 font-black" : "text-slate-400 dark:text-slate-505 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <LibraryBig size={20} />
          <span className="text-[9px] font-bold mt-1">{t("tabArchive")}</span>
        </button>

        {/* Admins Templates option */}
        {user.role === "Admin" && (
          <button
            onClick={() => { setActiveView("questions"); fetchQuestions(); }}
            className={`flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              activeView === "questions" ? "text-[#00448c] dark:text-blue-400 font-black" : "text-slate-400 dark:text-slate-505 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <FileQuestion size={20} />
            <span className="text-[9px] font-bold mt-1">{t("tabQuestions")}</span>
          </button>
        )}

        {/* Whatsapp option */}
        {user.role !== "Agent" && (
          <button
            onClick={() => { setActiveView("whatsapp-logs"); fetchWhatsAppLogs(); }}
            className={`flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              activeView === "whatsapp-logs" ? "text-[#00448c] dark:text-blue-400 font-black" : "text-slate-400 dark:text-slate-505 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-[9px] font-bold mt-1">{t("tabWhatsapp")}</span>
          </button>
        )}
      </nav>
    </div>
  );
}
