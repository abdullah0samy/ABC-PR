# Product Requirement Document (PRD)

## Project Name: ABC Hospital Visitor & Patient Satisfaction System (نظام رضا الزوار)
**Version:** 1.0.0  
**Target Platform:** Full-Stack Web Application (React + Vite + Express + Node.js)  
**Main Domain:** Patient Experience, Clinical Quality Assurance, and Automated Follow-up Management

---

## 1. Executive Summary
The **ABC Hospital Visitor & Patient Satisfaction System** is a high-fidelity, real-time feedback and clinical analytics platform designed for modern healthcare quality assurance teams. It empowers hospital agents and administrators to conduct interviews (In Person or via Phone Call), record detailed patient feedback across multiple departments (Medical, Nursing, Hospitality, Security), monitor automated WhatsApp satisfaction/apology alerts, and export executive compliance reports (Arabic-compatible Excel and high-fidelity PDF/Prints).

---

## 2. Document Objectives & Scope
This PRD outlines the technical architecture, data structures, user roles, functional specifications, and design guidelines of the application. It acts as the single source of truth for features currently active in the production environment.

---

## 3. Core Personas & Roles
The application implements strict role-based access control (RBAC) with three primary roles:

1. **Agent (موظف العلاقات/تجربة المريض):**
   - **Primary Action:** Conducts live interviews with patients and logs survey evaluations.
   - **Access Limits:** Restricted from viewing administrative dashboards, managing clinical questions/categories, or viewing system-wide telemetry logs.
2. **Manager (المدير العام / الجودة):**
   - **Primary Action:** Moniters systemic cumulative stats, filters analytics, audits WhatsApp messaging logs, and exports administrative reports.
   - **Access Limits:** Restricted from creating or altering evaluation records.
3. **Admin (مشرف النظام):**
   - **Primary Action:** Full unhindered access. Can submit surveys, manage categories, customize clinical questions, review WhatsApp notification logs, and view raw database states.

---

## 4. Key Functional Features

### 4.1. Security & Authentication Gate
- **Dynamic Access Control:** Safe server-side authentication proxying requests.
- **Session State:** Local secure state cache synchronized with `localStorage` to preserve login sessions.
- **Interface Toggling:** Automatic layout adjustments based on the logged-in user's role capabilities.

### 4.2. Analytical Intelligence Dashboard
- **Cumulative Satisfaction Index:** Real-time percentage indicator of systemic health based on active feedback ratings.
- **Clinical Category Breakdown:** Staggered comparative metrics showing performance across Medical, Nursing, Hospitality, and Security departments.
- **Advanced Dynamic Filters:** Interval segment filters (Today, Last 7 Days, Last 30 Days, Custom range) along with clinic type options (In-Patient vs. Out-Patient).
- **Critical Case Monitoring:** Quick list summarizing unsatisfied/critical cases requiring immediate administrative follow-up.

### 4.3. Interactive Questionnaire Creator
- **Dynamic Scoring Input:** Visual numeric evaluation slider/emoji selection panel to log clinical department scores (ranging from 1 to 5).
- **Patient Demographics Capture:** Full intake capture including Patient Name, Medical Record Number (MRN), Contact Details, Room Number/Clinic Name, Overseeing/Treating Doctor, and Entry Date.
- **Auto-Calculated Sentiment:** Automatically computes whether a patient is classified as "Satisfied" or "Unsatisfied" based on their score threshold, firing backend notifications on the fly.

### 4.4. Clinical Question & Category Management
- **Category Customization:** Create, modify, and delete clinical divisions (e.g., Medical, Nursing).
- **Granular Question Banks:** Tailor targeted clinical inquiries and associate them with a specific department category.

### 4.5. WhatsApp Follow-up & Apology Log (Evolution API Gateway)
- **Automated Alerts:** When an unsatisfied (critical) survey is logged, the backend automatically triggers an apology/corrective message via the Evolution API to the patient.
- **Live Logs:** Real-time dashboard showing the status of outgoing WhatsApp messages, sent timestamps, API webhook update latency metrics, and API status codes.

### 4.6. Multi-format Exporters
- **Arabic-Compatible Excel Export:** Instant compilation and formatting of clinical survey databases into a CSV/Excel file designed to display Arabic script flawlessly without corruption.
- **High-Fidelity PDF Executive Report:** Clean modal to customize header titles, notes, and metrics before calling a specialized print stylesheet optimized exclusively for page-break compliance and print typography.

---

## 5. Technology Stack & Architecture
- **Frontend SPA Framework:** React 18 + Vite
- **Backend API Server:** Node.js + Express (serving as a custom proxy keeping keys and DB operations safe)
- **Styling Utility:** Tailwind CSS v4 + custom `@variant dark` manually toggled theme rules
- **Icon Set:** Lucide React (standardized globally)
- **Local Persistence Storage:** Lightweight filesystem-backed JSON database engine (`db_data.json`) with auto-rebuilding schemas.

---

## 6. Data Model Schemas
The database holds five core entity arrays inside a unified schema structure:

```typescript
interface User {
  id: number;
  username: string;
  name: string;
  role: "Admin" | "Manager" | "Agent";
}

interface Category {
  id: number;
  nameEnglish: string;
  nameArabic: string;
}

interface Question {
  id: number;
  categoryId: number; // Links to Category
  textEnglish: string;
  textArabic: string;
}

interface Survey {
  id: number;
  patientName: string;
  medicalNumber: string;
  roomNumber?: string;
  phoneNumber?: string;
  doctorName?: string;
  interviewType: "Call" | "In Person";
  clinicType: "In-Patient" | "Out-Patient";
  enterDate: string; // ISO Date String
  isSatisfied: boolean;
  recommend: "Yes" | "No";
  agentId: number; // Creator
  createdAt: string;
}

interface ScoreRecord {
  id: number;
  surveyId: number;
  questionId: number;
  score: number; // 1 to 5
}

interface WhatsAppLog {
  id: number;
  surveyId: number;
  recipientPhone: string;
  recipientName: string;
  messageText: string;
  status: "Sent" | "Failed" | "Pending";
  sentAt: string;
  webhookUpdatedAt?: string;
}
```

---

## 7. Non-Functional & Visual Design Specifications

### 7.1. Responsive Display Architecture
- **Desktop Grid:** Fluid multi-column bento grids, sticky navigations, and comprehensive sidebars.
- **Mobile Comfort:** Fixed bottom tab-bar controls (`fixed bottom-0`), generous 44px tap targets, and scroll-friendly full-screen modals.

### 7.2. Systemic Theme Syncing (Dark & Light Modes)
- **Default State:** Eye-safe high-contrast Light mode (soft slate slate-50 canvas with deep charcoal texts).
- **Dark Mode Option:** Warm midnight slate background (`bg-slate-950` paired with `dark:text-slate-100` and `dark:bg-slate-900` cards) to support working in low-light clinical wards.
- **Theme Engine:** Pure CSS class-injection selector (`@variant dark (&:where(.dark, .dark *));` in Tailwind v4) bound seamlessly to state toggle triggers.

### 7.3. High-Quality Print Stylesheet
- Standardizes layout grids and hides web-specific elements (`no-print` classes such as headers, buttons, and settings inputs) while forcing custom layouts to display beautifully on paper or PDF viewports.
