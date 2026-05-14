-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ANALYST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "aadhaar" TEXT,
    "pan" TEXT,
    "gst" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "businessName" TEXT,
    "constitution" TEXT,
    "industryType" TEXT,
    "businessActivity" TEXT,
    "dateOfIncorporation" DATETIME,
    "isExistingBusiness" BOOLEAN NOT NULL DEFAULT true,
    "udyamNumber" TEXT,
    "cinNumber" TEXT,
    "promoterName" TEXT,
    "promoterExperience" INTEGER,
    "existingBanker" TEXT,
    "existingLoanDetails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL DEFAULT 'CMA',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "loanType" TEXT,
    "bankName" TEXT,
    "loanAmount" REAL,
    "loanPurpose" TEXT,
    "loanTenure" INTEGER,
    "moratoriumMonths" INTEGER,
    "interestRate" REAL,
    "repaymentFreq" TEXT,
    "existingEMI" REAL,
    "projectCost" TEXT,
    "meansOfFinance" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Report_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "yearType" TEXT NOT NULL DEFAULT 'HISTORICAL',
    "plData" TEXT,
    "bsLiabilities" TEXT,
    "bsAssets" TEXT,
    "calculatedRatios" TEXT,
    "isBalanced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialYear_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "salesGrowthPct" REAL NOT NULL DEFAULT 15,
    "rawMaterialPct" REAL NOT NULL DEFAULT 60,
    "salaryGrowthPct" REAL NOT NULL DEFAULT 10,
    "adminExpensePct" REAL NOT NULL DEFAULT 5,
    "powerExpensePct" REAL NOT NULL DEFAULT 3,
    "interestRate" REAL NOT NULL DEFAULT 12,
    "depreciationRate" REAL NOT NULL DEFAULT 10,
    "taxRate" REAL NOT NULL DEFAULT 25,
    "inflationRate" REAL NOT NULL DEFAULT 6,
    "capacityUtilization" TEXT NOT NULL DEFAULT '[70, 80, 85, 90, 95]',
    "debtorDays" INTEGER NOT NULL DEFAULT 45,
    "creditorDays" INTEGER NOT NULL DEFAULT 30,
    "inventoryDays" INTEGER NOT NULL DEFAULT 60,
    "projectionYears" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assumption_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Projection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "scenario" TEXT NOT NULL DEFAULT 'BASE',
    "plProjection" TEXT,
    "bsProjection" TEXT,
    "cfProjection" TEXT,
    "ratios" TEXT,
    "dscr" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Projection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "loanAmount" REAL NOT NULL,
    "interestRate" REAL NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "moratoriumMonths" INTEGER NOT NULL DEFAULT 0,
    "emiAmount" REAL,
    "scheduleData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanSchedule_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "firebaseUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedFile_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "tokens" INTEGER,
    "module" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MappingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "industry" TEXT,
    "sourceLabel" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MappingTemplate_sourceLabel_targetField_key" ON "MappingTemplate"("sourceLabel", "targetField");
