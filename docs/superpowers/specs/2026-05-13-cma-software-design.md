# Design Spec: CMA Report Generation Software (Firebase Edition)

## 1. Overview
A Credit Monitoring Arrangement (CMA) report is a standardized financial document required by Indian banks for loan applications. This software automates the generation of these reports using historical data, projection assumptions, and AI-driven narratives.

## 2. Tech Stack
- **Frontend**: React 18 (Vite), TypeScript, Tailwind CSS, shadcn/ui.
- **State Management**: Zustand.
- **Database**: Firebase Firestore.
- **Authentication**: Firebase Auth.
- **Storage**: Firebase Storage.
- **Backend (Optional/Secure Tasks)**: Firebase Cloud Functions.
- **AI**: Anthropic Claude API (via Cloud Functions).
- **Export**: ExcelJS (Excel) and Puppeteer/Firebase Functions (PDF).

## 3. Data Model (Firestore)
### Collections
- **`users`**: User profiles and roles.
- **`clients`**: Company details (name, CIN, PAN, industry).
- **`reports`**: CMA report metadata, status, and configuration.
- **`financials`**: Sub-collection within `reports` or separate collection linked by `reportId`. Stores Year-by-Year data (Income Statement, Balance Sheet).
- **`assumptions`**: Projection settings for each report.

## 4. Core Modules
### A. Calculation Engine (TypeScript)
A pure TypeScript module that computes:
- Projected P&L and Balance Sheets.
- Key Ratios: Current Ratio, D/E, DSCR, Interest Coverage, etc.
- MPBF (Method II) based on RBI guidelines.

### B. AI Integration (Claude)
- **Executive Summary**: Generates a professional narrative based on financial trends.
- **Assumption Advisor**: Suggests realistic growth and margin rates based on industry and history.
- **Anomaly Detection**: Flags red flags for credit officers.

### C. Export Module
- **Excel**: Generates multi-sheet Excel files matching bank standards.
- **PDF**: Renders a polished financial report PDF.

## 5. UI/UX Flow
1. **Dashboard**: Manage clients and reports.
2. **Data Entry**: Multi-step forms for historical financials.
3. **Assumptions**: Interactive form with AI suggestions.
4. **Preview**: Real-time charts and tables of all 12 CMA schedules.
5. **Narrative**: Edit and finalize the AI-generated summary.
6. **Export**: One-click download for Excel/PDF.

## 6. Security
- Firebase Security Rules to ensure data isolation.
- API Keys stored in Firebase Environment Variables (Cloud Functions).
- Role-based access (Admin/Analyst).
