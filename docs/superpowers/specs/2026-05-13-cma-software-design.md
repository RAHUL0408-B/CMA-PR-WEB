# Design Spec: CMA Pro AI (Hybrid Architecture)

## 1. Overview
**CMA Pro AI** is an enterprise-grade SaaS platform for generating Credit Monitoring Arrangement (CMA) reports. It automates financial parsing, projection, ratio analysis, and narrative generation for Indian banking standards.

## 2. Hybrid Tech Stack
- **Frontend**: React 18 (Vite), TypeScript, Tailwind CSS, **AG Grid**, Zustand, Recharts.
- **Backend**: Node.js 20, Express, TypeScript, **Prisma ORM**.
- **Database (Structured)**: **SQLite** (for local development) / **PostgreSQL** (for production).
- **Database (Real-time)**: **Firebase Firestore** (for drafts, notifications, and progress).
- **Authentication**: **Firebase Auth** (Custom Claims for Roles: Admin, Analyst, Viewer).
- **Storage**: **Firebase Storage** (Uploaded spreadsheets and generated reports).
- **AI**: Anthropic **Claude 3.5 Sonnet** (via Firebase Cloud Functions).
- **Export**: **ExcelJS** (Bank-ready Excel) and **Puppeteer** (PDF).

## 3. Core Modules
1.  **Auth Module**: Firebase integration + Role-based access.
2.  **Client/Report Management**: CRUD for companies and financial projects.
3.  **Financial Import**: SheetJS parsing of Balance Sheets/P&L.
4.  **Dynamic Account Mapping**: Fuzzy matching and AI-suggested account mapping.
5.  **CMA Calculation Engine**: Banking-grade formulas (MPBF, DSCR, etc.).
6.  **Projection Engine**: 2-5 year forecasts with editable assumptions.
7.  **Ratio Analysis**: Liquidity, Solvency, Efficiency, and Banking ratios.
8.  **AI Narrative Generator**: Executive summary and risk detection via Claude.
9.  **Export Engines**: High-fidelity Excel (multiple sheets) and PDF exports.
10. **Dashboard**: Analytics and trend charts via Recharts.

## 4. Data Model (Prisma)
- `User`: Profile and role.
- `Client`: Company metadata.
- `CMAReport`: Parent record for a report.
- `FinancialYear`: Raw and computed data for each FY.
- `ProjectionAssumption`: Growth rates, margins, and WC days.
- `Ratio`: Computed ratios per year.

## 5. UI/UX Flow
- **Clean Fintech Aesthetic**: Professional, data-dense but readable.
- **Excel-like Tables**: AG Grid for direct financial editing.
- **Real-time Feedback**: Firestore listeners for AI and export progress.

## 6. Security
- Firebase custom claims for RBAC.
- Backend validation of Firebase ID tokens.
- SQL injection prevention via Prisma.
- Environment-based API key management.
