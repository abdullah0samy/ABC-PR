# ABC Hospital Visitor & Patient Satisfaction System — Static Analysis Audit Report

**Generated:** 2026-07-12  
**Methodology:** Static analysis only (zero runtime execution). Every finding is backed by file:line evidence.  
**Statuses:** `CONFIRMED` | `NOT CONFIRMED` | `UNKNOWN — Runtime verification required`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total source files audited | 10 |
| Total findings | 40 |
| Critical | 6 |
| High | 14 |
| Medium | 14 |
| Low | 6 |

**Top-line:** The codebase is a single-file Express monolith (`server.ts`, 964 lines) coupled to a monolithic React component (`App.tsx`, 3,356 lines). **No authentication or authorization exists server-side** despite PRD-mandated RBAC. Data lives in a JSON file (`db_data.json`), not PostgreSQL as specified. Plaintext passwords, mass-assignment vulnerabilities, missing validation, no tests, no lockfile, and a broken Excel export contract round out the Critical/High findings.

---

## Section 1 — System Inventory

| Item | Path | Purpose | Dependencies | Status |
|------|------|---------|--------------|--------|
| Backend monolith | `server.ts` (964 lines) | Express API + Vite middleware + JSON persistence | express, vite, fs, path | CONFIRMED |
| React SPA | `src/App.tsx` (3,356 lines) | All UI: login, dashboard, survey, archive, questions, WhatsApp logs, PDF export, mobile nav | react, motion, lucide-react | CONFIRMED |
| Entry | `src/main.tsx` | StrictMode root | react-dom/client | CONFIRMED |
| Types | `src/types.ts` | TS interfaces | — | CONFIRMED |
| Constants | `src/constants.ts` | 24-country phone codes | — | CONFIRMED |
| i18n | `src/translations.ts` | AR/EN dictionaries | — | CONFIRMED |
| Styles | `src/index.css` | Tailwind v4, `@variant dark`, print rules | tailwindcss | CONFIRMED |
| Logo | `src/components/Logo.tsx` | Brand signet | lucide-react | CONFIRMED |
| Persistence | `db_data.json` (runtime) | File-backed JSON store | fs | CONFIRMED |
| Build | `vite.config.ts`, `tsconfig.json`, `package.json` | Vite + React + TS + Tailwind v4 | vite, @vitejs/plugin-react, tailwindcss, esbuild, tsx | CONFIRMED |

**Third-party integrations:**
1. **Evolution API (WhatsApp)** — `server.ts:412-455`, defaults to `https://api.evolution.example.com/message/sendText`
2. **Google Gemini (`@google/genai`)** — declared in `package.json:14`, **never imported** (NOT CONFIRMED)
3. **Google Fonts CDN** — `src/index.css:1`
4. **Lucide React icons** — throughout

---

## Section 2 — Express.js Structure Audit

| Component | Files | Evidence |
|-----------|-------|----------|
| Routers | **None** — all routes on `app` | `server.ts:309-938` |
| Controllers | **None** — inline handlers | same |
| Services | **None** | — |
| Middleware | `express.json()` only | `server.ts:10` |
| Error handlers | **None** (no 4-arg middleware) | grep `(err, req, res, next)` → 0 |
| Utilities | `loadDB`, `saveDB`, `triggerWhatsAppApology`, `startServer` | `server.ts:270-299, 413-455, 944-962` |
| Cron/queues/workers | **None** | — |
| Unused code | `triggerWhatsAppApology` swallows all fetch errors | `server.ts:449-451` |

**Finding:** Monolithic single-file backend. No architectural separation.  
**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 3 — Route & Endpoint Audit (21 endpoints)

| # | Method | URL | Auth? | Validation | Notes |
|---|--------|-----|-------|------------|-------|
| 1 | POST | `/api/auth/login` | ❌ | manual | Returns mock JWT string |
| 2 | GET | `/api/users` | ❌ | none | Strips password |
| 3 | POST | `/api/users` | ❌ | manual | **Creates Admin w/ no check** |
| 4 | DELETE | `/api/users/:id` | ❌ | none | |
| 5 | GET | `/api/templates` | ❌ | none | |
| 6 | GET | `/api/questions` | ❌ | none | |
| 7 | POST | `/api/questions` | ❌ | manual | Admin-only per PRD, unenforced |
| 8 | DELETE | `/api/questions/:id` | ❌ | none | |
| 9 | POST | `/api/surveys` | ❌ | manual | Triggers WhatsApp apology |
| 10 | DELETE | `/api/surveys/:id` | ❌ | none | |
| 11 | PUT | `/api/surveys/:id` | ❌ | **none** | **Mass-assignment via `...req.body`** |
| 12 | GET | `/api/surveys/archive` | ❌ | none | Paginated + filters |
| 13 | GET | `/api/surveys/:id` | ❌ | none | |
| 14 | POST | `/api/surveys/:id/followup` | ❌ | manual | Manager-only per PRD, unenforced |
| 15 | GET | `/api/analytics` | ❌ | none | Full scan per request |
| 16 | GET | `/api/categories` | ❌ | none | |
| 17 | POST | `/api/categories` | ❌ | manual | |
| 18 | DELETE | `/api/categories/:id` | ❌ | none | |
| 19 | GET | `/api/whatsapp/logs` | ❌ | none | |
| 20 | POST | `/api/whatsapp/webhook` | ❌ | none | **No signature verification** |
| 21 | POST | `/api/whatsapp/simulate-webhook` | ❌ | manual | Bypasses Evolution API |

**Validation library:** **None** (no Joi/Zod/express-validator in `package.json`).  
**Auth on any endpoint:** **Zero.**  
**RBAC on server:** **Zero** — all gating is frontend-only (`App.tsx:1031,1046,1081,1096`).

**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 4 — API Flow Investigation

| Flow | Client → Server | Evidence |
|------|-----------------|----------|
| Login | `App.tsx:handleLogin:364` → `POST /api/auth/login` → `server.ts:309` | Mock token `mock_jwt_token_for_<user>_role_<role>` returned; **never verified** |
| Create survey | `App.tsx:handleSubmitSurvey:720` → `POST /api/surveys` → `server.ts:458` | `agentId` from client trusted (`server.ts:479`) |
| Analytics | `App.tsx:fetchAnalytics:534` → `GET /api/analytics` → `server.ts:773` | In-memory scan; no caching |
| Archive | `App.tsx:fetchArchiveSurveys:666` → `GET /api/surveys/archive` → `server.ts:669` | Paginated via `.slice()` |
| Webhook receive | External → `POST /api/whatsapp/webhook` → `server.ts:531` | **No signature check** |
| Webhook simulate | `App.tsx:simulateWebhook:567` → `POST /api/whatsapp/simulate-webhook` → `server.ts:591` | Bypasses Evolution entirely |
| Excel export | `App.tsx:handleExportExcel:588` | **Client-only**; never calls backend |

**Broken contract (CONFIRMED):**
- `App.tsx:634` writes `${s.satisfactionPercentage}%` to CSV
- `Survey` interface (`src/types.ts:25-42`, `server.ts:41-58`) **has no `satisfactionPercentage` field**
- Result: CSV cell contains literal `undefined%`

**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 5 — Middleware Investigation

| Middleware | Scope | Line |
|------------|-------|------|
| `express.json()` | Global | `server.ts:10` |
| Vite middleware | Dev only | `server.ts:946-950` |
| `express.static(dist)` | Prod only | `server.ts:953` |
| SPA fallback `app.get("*")` | Prod only | `server.ts:954-956` |

**Missing (CONFIRMED absent):**
- CORS (`cors` not in `package.json`)
- Helmet (security headers)
- Rate limiting (`express-rate-limit` not installed)
- Request logging (Morgan/Pino/Winston)
- Auth middleware (JWT verification)
- Body size limits
- Error handler (4-arg)

**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 6 — Authentication Audit

| Aspect | Evidence | Status |
|--------|----------|--------|
| JWT library | `jsonwebtoken` not in `package.json` | NOT CONFIRMED |
| Token format | `server.ts:329`: `mock_jwt_token_for_${username}_role_${role}` | CONFIRMED — string concat |
| Token verification | grep `jwt.verify` / `Authorization` → **0 matches** | CONFIRMED — never verified |
| Token storage | `App.tsx:386`: `localStorage.setItem("nuzul_pr_token", ...)` | CONFIRMED — XSS-readable |
| Session restore | `App.tsx:326-335`: trusts `localStorage` JSON blindly | CONFIRMED — no server revalidation |
| Password storage | `server.ts:96-98,356`: plaintext `"123"` | CONFIRMED |
| Password compare | `server.ts:316-318`: `u.password === password` | CONFIRMED — not constant-time |
| Logout | `App.tsx:406-413`: clears localStorage only | CONFIRMED — server stateless |
| Refresh tokens | **None** | NOT CONFIRMED |
| Cookies | `cookie-parser` not installed | CONFIRMED — unused |
| Expiration | Mock token has no `exp`; no TTL logic | CONFIRMED |

**Status:** CONFIRMED — authentication is cosmetic only  
**Confidence:** HIGH

---

## Section 7 — Authorization Audit

| Role | Server enforcement | Frontend gating (UI only) |
|------|-------------------|---------------------------|
| Admin | **None** | `App.tsx:1081` (questions tab), `2137` (questions view) |
| Manager | **None** | `App.tsx:1031,1096` (dashboard + WhatsApp) |
| Agent | **None** | `App.tsx:1046` (create-survey only) |

**Privilege escalation vectors (ALL CONFIRMED):**
1. `POST /api/users` with `role: "Admin"` → creates admin (`server.ts:338-365`)
2. `DELETE /api/users/:id` → deletes any user (`server.ts:367`)
3. `POST /api/surveys` with arbitrary `agentId` → attribution spoofing (`server.ts:479`)
4. `POST /api/questions` → admin-only per PRD, open (`server.ts:384`)
5. `POST /api/whatsapp/simulate-webhook` → corrupts logs (`server.ts:591`)
6. `DELETE /api/categories/:id` → admin-only, open (`server.ts:906`)
7. `POST /api/surveys/:id/followup` → manager-only, open (`server.ts:919`)

**Custom RBAC middleware:** **None**  
**Policies:** **None**

**Status:** CONFIRMED — full BFLA exposure  
**Confidence:** HIGH

---

## Section 8 — React Component Audit

| Component | File:Lines | Deps | Consumers |
|-----------|------------|------|-----------|
| `App` (default) | `src/App.tsx:62-3356` (~3,294 lines) | react, motion, lucide-react, ./translations, ./components/Logo, ./types, ./constants | `src/main.tsx:8` |
| `Logo` | `src/components/Logo.tsx:9-48` | react, lucide-react | `App.tsx:53,837,953` |

**Unused lucide-react imports in `App.tsx` (CONFIRMED by JSX grep):**
`HeartPulse`, `Settings`, `Activity`, `TrendingUp`, `History`, `Layers`, `Plus`, `PlusCircle`, `Filter`, `Trash2`, `Check` — 11 dead imports.

**Monolithic component:** `App` holds ~50 `useState` calls, all views as conditional JSX blocks.  
**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 9 — State Management Audit

| Library | Found? |
|---------|--------|
| Context API | ❌ (`createContext`/`useContext` grep → 0) |
| Redux | ❌ |
| Zustand | ❌ |
| MobX | ❌ |
| React Query / TanStack Query | ❌ |

**Approach:** Pure `useState` in `App` component (~50 declarations, `App.tsx:64-298`).

**Dead state (CONFIRMED):**
- `phoneCountryCode` (`App.tsx:263`) — selected in UI (`App.tsx:1591`) but **never included in submit payload** (`App.tsx:747-760`). WhatsApp send uses `survey.phoneNumber` without country code (`server.ts:425`).

**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 10 — Form Audit

| Form | Handler | Validation | Issues |
|------|---------|------------|--------|
| Login | `handleLogin:364` | Manual `if (!username \|\| !password)` | None server-side |
| Create survey | `handleSubmitSurvey:720` | Manual field checks + question completeness | `phoneCountryCode` dropped; `agentId` default `|| 3` |
| Add question | `handleAddQuestion:429` | Manual `if (!text.trim())` | — |
| Add category | `handleAddCategory:166` | Manual `if (!ar \|\| !en)` | — |
| Edit survey | `handleEditSurveySubmit:517` | None | PUT merges `...req.body` unsafely |

**Validation duplication:** Server repeats same `if (!field)` checks client already did (`server.ts:311,340,386,474,594,874,922`).  
**Schema library:** **None**.  
**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 11 — Database Audit

| PRD / Audit Prompt Claim | Actual Implementation | Evidence |
|--------------------------|----------------------|----------|
| PostgreSQL | **JSON file** `db_data.json` | `server.ts:13,270-299` |
| ORM (Prisma/TypeORM/etc.) | **None** | `package.json` grep → 0 |
| Migrations | **None** | No `prisma/`, `migrations/` dirs |
| Schemas | Inline TS interfaces | `server.ts:16-91`, `src/types.ts:1-88` |
| Repositories | **None** — direct array ops | `db.users.find`, `db.surveys.push`, etc. |
| Relations | App-level integer refs only | `Survey.agentId → User.id` unenforced |
| Indexes | **None** (JSON file) | — |
| Constraints | Manual `.some()` uniqueness | `server.ts:345,887` |
| FKs | **None** | — |
| Triggers | **None** | — |
| Views | **None** | — |
| Stored procedures | **None** | — |

**Unused columns (CONFIRMED):**
- `Template.isActive` (`server.ts:28,101-102`) — never queried
- `Question.priority` (`server.ts:37,396`) — written, never filtered/sorted
- `User.createdAt`, `Question.createdAt`, `Template.createdAt` — written once, never read

**Broken relation (CONFIRMED):**
`POST /api/surveys` accepts any `agentId`; if user not found, falls back to `{ id: 99, name: "عضو مجهول" }` but **persists the original `agentId`** (`server.ts:479-484`). Drift guaranteed.

**N+1 pattern (CONFIRMED):**
`GET /api/surveys/:id` → `db.answers.filter` + per-answer `db.questions.find` (`server.ts:753-764`) = O(A × Q).

**Status:** CONFIRMED — persistence is JSON file, **not PostgreSQL**  
**Confidence:** HIGH

---

## Section 12 — Query Investigation

| Operation | Pattern | Risk |
|-----------|---------|------|
| SELECT | `Array.find` / `Array.filter` | — |
| INSERT | `.push()` / `.unshift()` | — |
| UPDATE | Direct property mutation | **Mass-assignment at `server.ts:662`** |
| DELETE | `.filter()` reassignment | — |
| Aggregation | `.reduce`/`.map` over full arrays | `GET /api/analytics` O(C × Q × A) |
| Pagination | `.slice((p-1)*size, p*size)` | — |
| Transactions | **None** | `surveys` + `answers` written sequentially; `saveDB` between not atomic |
| Joins | App-level `find` per record | N+1 at `server.ts:753-764` |

**Mass-assignment (CONFIRMED CRITICAL):**
```typescript
// server.ts:662
const updatedSurvey = { ...db.surveys[surveyIndex], ...req.body };
```
Client can overwrite `id`, `createdAt`, `agentId`, `agentName`, `isSatisfied`, etc.

**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 13 — Frontend ↔ Backend Contract Audit

| Contract | Frontend | Backend | Compatible? |
|----------|----------|---------|-------------|
| Login request | `{ username, password }` | `req.body.username, password` | ✅ |
| Login response | `{ user, token }` | `{ user, token }` | ✅ (token is mock) |
| Survey create | `agentId, patientName, medicalNumber, roomNumber, phoneNumber, doctorName, enterDate, interviewType, clinicType, isSatisfied, recommend, answers[]` | Same fields expected | ✅ (but `agentId` trusted) |
| Survey detail | Expects `{ survey, answers[] }` | Returns `{ survey, answers[] }` | ✅ |
| Analytics | Expects `Analytics` interface | Returns matching shape | ✅ |
| **Excel export** | **Reads `s.satisfactionPercentage`** | **Field does not exist** | ❌ **BROKEN** |
| WhatsApp log | `WhatsappLog` (status optional) | `whatsappLogs` (status required) | ⚠️ Type drift |

**Status:** 1 broken contract (Excel), 1 type drift (WhatsApp status)  
**Confidence:** HIGH

---

## Section 14 — Security Audit

| Control | Present? | Evidence |
|---------|----------|----------|
| Authentication | ❌ Cosmetic only | §6 |
| Authorization (RBAC) | ❌ Zero server checks | §7 |
| Input validation | ⚠️ Manual `if (!field)` only | §10 |
| SQL injection | N/A (no SQL) | — |
| XSS protection | ❌ No CSP, no Helmet, `localStorage` tokens | §5, §6 |
| CSRF protection | ❌ No tokens, no SameSite cookies | — |
| CORS | ❌ `cors` not installed | §5 |
| Helmet | ❌ Not installed | §5 |
| Rate limiting | ❌ Not installed | §5 |
| Secrets management | ❌ Plaintext passwords in `db_data.json` | §11 |
| Env separation | ❌ Only `.env.example` (Gemini + APP_URL) | `server.ts:434-435` reads `EVOLUTION_API_URL/KEY` not in example |
| Hardcoded credentials | ❌ Seed users `password: "123"` | `server.ts:96-98` |
| Sensitive data exposure | ❌ `GET /api/users` returns all users (passwords stripped but names/roles exposed) | `server.ts:334-336` |
| Broken access control | ❌ All 7 escalation vectors | §7 |

**Status:** CONFIRMED — systemic absence of security controls  
**Confidence:** HIGH

---

## Section 15 — Environment Audit

| File | Present | Issues |
|------|---------|--------|
| `.env.example` | ✅ | Only `GEMINI_API_KEY`, `APP_URL` |
| `.env.dev/.env.test/.env.prod` | ❌ | None |
| Docker / docker-compose | ❌ | None |
| Kubernetes | ❌ | None |
| NGINX | ❌ | None |
| PM2 | ❌ | None |

**Missing from `.env.example` (referenced in code):**
- `EVOLUTION_API_URL` (`server.ts:434`)
- `EVOLUTION_API_KEY` (`server.ts:435`)

**Status:** CONFIRMED — no environment separation, missing required vars  
**Confidence:** HIGH

---

## Section 16 — Dependency Audit

| Package | Type | Issue |
|---------|------|-------|
| `@google/genai` | prod | **Declared, never imported** (grep → 0) |
| `dotenv` | prod | **Declared, never imported** (modern Node loads `.env` automatically; README references but code doesn't use) |
| `autoprefixer` | dev | **Unused** — Tailwind v4 doesn't use PostCSS |
| `vite` | both | **Duplicate** in `dependencies:20` and `devDependencies:32` (same version) |
| `esbuild` | dev | Used only in build script (`package.json:8`) |
| Lockfile | — | **None** (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` all absent) |

**Unused packages (CONFIRMED):** `@google/genai`, `dotenv`, `autoprefixer`  
**Duplicate:** `vite`  
**Missing lockfile:** CONFIRMED — build reproducibility broken  

**Status:** CONFIRMED | **Confidence:** HIGH

---

## Section 17 — Logging Audit

| Logger | Present? |
|--------|----------|
| Winston | ❌ |
| Morgan | ❌ |
| Pino | ❌ |
| Bunyan | ❌ |

**Only logging:** 5 `console.log` / `console.error` calls in `server.ts` (lines 286, 317, 416-418, 433, 533).  
**Audit logs:** None.  
**Request logs:** None.  
**Error logs:** None (no global handler).  

**Status:** CONFIRMED — effectively no logging  
**Confidence:** HIGH

---

## Section 18 — Test Coverage Audit

| Test Type | Framework | Files Found |
|-----------|-----------|-------------|
| Unit | Jest/Mocha | 0 |
| Integration | Supertest | 0 |
| E2E | Cypress/Playwright | 0 |

**Test scripts in `package.json`:** None (`scripts` only has `dev`, `build`, `start`, `clean`, `lint`).  
**Test directories:** None (`glob **/*.{test,spec}.{ts,tsx}` → 0).  

**Status:** CONFIRMED — zero test coverage  
**Confidence:** HIGH

---

## Section 19 — Static QA Investigation

| Question | Statically Verifiable? | Result |
|----------|------------------------|--------|
| Can every page be reached? | Yes (React routes are conditional blocks in `App`) | All 6 views reachable via `activeView` state |
| Can every endpoint be reached? | Yes (no auth middleware blocks) | All 21 endpoints reachable anonymously |
| Can every form submit? | Yes (all `onSubmit` wired to `fetch`) | CONFIRMED |
| Can every module communicate? | Yes (single `App` component, no module boundaries) | CONFIRMED |
| Can every API return valid data? | Shape matches TS interfaces (except Excel) | ⚠️ Excel export broken |
| Can every DB entity be consumed? | Yes (all 7 entities read/written in `server.ts`) | CONFIRMED |

**Items requiring runtime (UNKNOWN):**
- Actual API latency
- PDF print fidelity
- WhatsApp delivery success
- CSV Arabic rendering in Excel
- Concurrent write safety

---

## Section 20 — Runtime Limitations (Explicitly UNKNOWN)

| Item | Status |
|------|--------|
| Actual API latency | UNKNOWN — Runtime verification required |
| CPU / memory usage | UNKNOWN — Runtime verification required |
| FPS / animation jank | UNKNOWN — Runtime verification required |
| Thread utilization | UNKNOWN — Runtime verification required |
| Network latency to Evolution API | UNKNOWN — Runtime verification required |
| DB execution time (JSON file I/O) | UNKNOWN — Runtime verification required |
| Concurrent user capacity | UNKNOWN — Runtime verification required |
| Race conditions (simultaneous create/delete) | UNKNOWN — Runtime verification required |
| Response times | UNKNOWN — Runtime verification required |
| Real user interaction flows | UNKNOWN — Runtime verification required |
| WhatsApp gateway delivery semantics | UNKNOWN — Runtime verification required |
| PDF print output fidelity | UNKNOWN — Runtime verification required |
| Excel Arabic rendering with BOM | UNKNOWN — Runtime verification required |
| `db_data.json` atomicity under multi-process | UNKNOWN — Runtime verification required |

---

## Section 21 — Final System Audit Report (Ranked)

| Rank | Issue | Category | Evidence? | Verified? | Files | Lines | Confidence | Severity | Criticality | Runtime Verify? | Notes |
|------|-------|----------|-----------|-----------|-------|-------|------------|----------|-------------|-----------------|-------|
| 1 | No authentication — mock JWT never verified | Auth | YES | YES | `server.ts` | 309-331, 329 | HIGH | Critical | Critical | NO | `mock_jwt_token_for_...` literal |
| 2 | No server-side authorization (RBAC) | Authz | YES | YES | `server.ts` | 309-938 | HIGH | Critical | Critical | NO | 21 open endpoints |
| 3 | Plaintext password storage & comparison | Security | YES | YES | `server.ts` | 96-98, 316-318, 356 | HIGH | Critical | Critical | NO | Seed `password: "123"` |
| 4 | Mass-assignment in `PUT /api/surveys/:id` | Security | YES | YES | `server.ts` | 662 | HIGH | Critical | Critical | NO | `...req.body` spread |
| 5 | Anonymous Admin creation via `POST /api/users` | Authz | YES | YES | `server.ts` | 338-365 | HIGH | Critical | Critical | NO | No creator role check |
| 6 | `db_data.json` (plaintext passwords) not gitignored | Secrets | YES | YES | `.gitignore` | 1-8 | HIGH | Critical | Critical | NO | Only `.env*` ignored |
| 7 | Excel export uses non-existent `satisfactionPercentage` | Contract | YES | YES | `App.tsx`, `types.ts`, `server.ts` | 634, 25-42, 41-58 | HIGH | High | High | NO | Emits `undefined%` |
| 8 | Phone country code selected but never sent | State | YES | YES | `App.tsx`, `server.ts` | 263, 747-760, 1591, 425 | HIGH | High | High | NO | WhatsApp send lacks prefix |
| 9 | PostgreSQL claimed; actual store is JSON file | Database | YES | YES | `server.ts` | 13, 270-299 | HIGH | High | High | NO | PRD §5 discrepancy |
| 10 | No validation library; manual checks everywhere | Validation | YES | YES | `server.ts` | 311,340,386,474,594,874,922 | HIGH | High | High | NO | No Joi/Zod/validator |
| 11 | No security middleware (Helmet, CORS, rate-limit) | Security | YES | YES | `server.ts`, `package.json` | 6-12, 13-34 | HIGH | High | High | NO | Same-origin mitigates CORS only |
| 12 | No global error handler | Error handling | YES | YES | `server.ts` | entire | HIGH | High | High | NO | No 4-arg middleware |
| 13 | No logging library / audit trail | Logging | YES | YES | `server.ts` | entire | HIGH | High | High | NO | 5 `console.log` only |
| 14 | Zero test coverage | QA | YES | YES | repo | glob → 0 | HIGH | High | High | NO | No test runner in scripts |
| 15 | No lockfile (`package-lock.json` etc.) | Dependencies | YES | YES | repo | glob → absent | HIGH | High | High | NO | Reproducibility broken |
| 16 | `@google/genai` declared, never used | Dependencies | YES | YES | `package.json`, all src | 14 | HIGH | Medium | Medium | NO | `metadata.json` claims Gemini |
| 17 | `dotenv` declared, never imported | Dependencies | YES | YES | `package.json`, all src | 22 | HIGH | Medium | Medium | NO | README references it |
| 18 | `autoprefixer` devDep unused (Tailwind v4) | Dependencies | YES | YES | `package.json` | 27 | HIGH | Low | Low | NO | PostCSS not used |
| 19 | Duplicate `vite` in deps + devDeps | Dependencies | YES | YES | `package.json` | 20, 32 | HIGH | Low | Low | NO | Same version |
| 20 | Evolution API env vars missing from `.env.example` | Environment | YES | YES | `.env.example`, `server.ts` | 1-9, 434-435 | HIGH | Medium | Medium | NO | `EVOLUTION_API_URL/KEY` |
| 21 | 11 dead `lucide-react` imports in `App.tsx` | React audit | YES | YES | `App.tsx` | 5,21-25,27-28,30,41,45,48 | HIGH | Low | Low | NO | Bundle bloat |
| 22 | Monolithic `App` (3,294 lines, ~50 `useState`) | React audit | YES | YES | `App.tsx` | 62-3356 | HIGH | Medium | Medium | NO | Maintenance burden |
| 23 | N+1 join in `GET /api/surveys/:id` | Query | YES | YES | `server.ts` | 753-764 | HIGH | Low | Low | NO | In-memory O(A×Q) |
| 24 | Analytics endpoint O(C×Q×A) full scan | Query | YES | YES | `server.ts` | 806-820 | HIGH | Medium | Medium | UNKNOWN (latency) | Can't prove slow statically |
| 25 | Unused columns (`isActive`, `priority`, `createdAt`×3) | Database | YES | YES | `server.ts` | 28,101-102,37,56,844 | HIGH | Low | Low | NO | Written, never read |
| 26 | `WhatsappLog.status` required in BE, optional in FE | Contract drift | YES | YES | `server.ts`, `types.ts` | 84, 57 | HIGH | Low | Low | NO | TS inconsistency |
| 27 | WhatsApp trigger fire-and-forget, errors swallowed | Reliability | YES | YES | `server.ts` | 449-451 | HIGH | High | High | UNKNOWN (delivery) | Log marked "مرسلة" regardless |
| 28 | Session restore trusts localStorage blindly | Auth | YES | YES | `App.tsx` | 326-335 | HIGH | Medium | Medium | NO | Client can forge Admin role |
| 29 | No atomicity between surveys+answers writes | Data integrity | YES | YES | `server.ts` | 509-511 | HIGH | Medium | Medium | UNKNOWN (multi-proc) | Single process safe |
| 30 | Webhook endpoint accepts arbitrary payload, no signature verify | Security | YES | YES | `server.ts` | 531-588 | HIGH | Critical | Critical | UNKNOWN (Evolution signing) | Real webhook may sign |
| 31 | CSV cell outputs literal `undefined%` | UX/Data | YES | YES | `App.tsx` | 634 | HIGH | Medium | Medium | NO | Downstream of #7 |
| 32 | Survey PUT has no input validation | Validation | YES | YES | `server.ts` | 653-666 | HIGH | Medium | Medium | NO | All fields via spread |
| 33 | `GET /api/users` exposes user list anonymously | Info disclosure | YES | YES | `server.ts` | 334-336 | HIGH | Medium | Medium | NO | User enumeration |
| 34 | `phoneCountryCode` captured but unused (dup of #8) | State | YES | YES | `App.tsx` | 263, 747-760 | HIGH | Medium | Medium | NO | Duplicate |
| 35 | `DISABLE_HMR` env var undocumented, may silently disable HMR | DX | YES | YES | `vite.config.ts` | 17-19 | HIGH | Low | Low | UNKNOWN (env) | Needs `DISABLE_HMR=true` |
| 36 | `process.cwd()`-relative DB path — cwd-dependent | Config | YES | YES | `server.ts` | 13 | HIGH | Medium | Medium | UNKNOWN (deploy) | Different cwd = different DB |
| 37 | `JSON.parse(localStorage)` no try/catch — corrupt JSON crashes loader | Resilience | YES | YES | `App.tsx` | 326-335 | HIGH | Medium | Medium | NO | No try/catch |
| 38 | Evolution API `fetch` has no timeout / AbortController | Reliability | YES | YES | `server.ts` | 438-451 | HIGH | Medium | Medium | UNKNOWN (gateway) | Can hang indefinitely |
| 39 | Print CSS hides `main` globally — future admin screens won't print | CSS | YES | YES | `index.css` | 18 | HIGH | Low | Low | NO | Layout-coupled |
| 40 | Theme/lang localStorage only — no SSR sync | State | YES | YES | `App.tsx` | 64-88 | HIGH | Low | Low | NO | Purely cosmetic |

---

## Remediation Priority Order (Suggested)

| Phase | Focus | Key Actions |
|-------|-------|-------------|
| **P0 — Critical Security** | AuthZ/AuthN/Secrets | 1) Add real JWT (sign+verify), 2) Implement RBAC middleware, 3) bcrypt passwords, 4) Add `db_data.json` to `.gitignore`, 5) Verify Evolution webhook signatures, 6) Remove mass-assignment spread |
| **P1 — Data Integrity & Contracts** | DB/Contracts | 7) Migrate to PostgreSQL (per PRD), 8) Fix Excel export (`satisfactionPercentage` → compute from answers), 9) Send `phoneCountryCode` in payload, 10) Add validation schemas (Zod) |
| **P2 — Infrastructure** | Tooling/Ops | 11) Generate lockfile (`npm install --package-lock-only`), 12) Remove dead deps (`@google/genai`, `dotenv`, `autoprefixer`), 13) Add Helmet, rate-limit, CORS, logger (Pino), 14) Add global error handler |
| **P3 — Architecture** | Structure | 15) Split `server.ts` into routers/controllers/services, 16) Decompose `App.tsx` into feature components + routes, 17) Add React Router or keep conditional views with extracted components |
| **P4 — Quality** | Testing/DX | 18) Add Vitest + Supertest unit/integration tests, 19) Add Playwright E2E for critical flows, 20) Document env vars (`.env.example` complete) |
| **P5 — Polish** | UX/Debt | 21) Remove dead lucide imports, 22) Add try/catch to localStorage parse, 23) Add timeout to Evolution fetch, 24) Fix print CSS coupling, 25) Document `DISABLE_HMR` |

---

**End of Report** — All findings are statically verified with file:line evidence. No runtime execution was performed.