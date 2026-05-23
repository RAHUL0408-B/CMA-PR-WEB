/**
 * CMA Pro AI - Financial Projection Engine
 * Banking-grade calculations. All formulas are standard RBI/banking norms.
 */

export interface PLData {
  grossSales: number;
  otherIncome: number;
  rawMaterial: number;
  salaryWages: number;
  powerFuel: number;
  manufacturingExp: number;
  adminExp: number;
  sellingExp: number;
  rent: number;
  repairMaintenance: number;
  depreciation: number;
  interestExp: number;
  taxExpense: number;
}

export interface BSData {
  assets: {
    landBuilding: number;
    plantMachinery: number;
    furniture: number;
    vehicle: number;
    investments: number;
    inventory: number;
    sundryDebtors: number;
    cashBank: number;
    loansAdvances: number;
    otherCurrentAssets: number;
  };
  liabilities: {
    shareCapital: number;
    reserves: number;
    securedLoan: number;
    unsecuredLoan: number;
    ccOdLimit: number;
    tradeCreditors: number;
    otherCurrentLiab: number;
    provisions: number;
  };
}

export interface FinancialRatios {
  // Profitability
  grossMarginPct: number;
  netMarginPct: number;
  ebitda: number;
  ebitdaMarginPct: number;
  ebit: number;
  pat: number;
  // Liquidity
  currentRatio: number;
  quickRatio: number;
  // Solvency
  debtEquityRatio: number;
  interestCoverageRatio: number;
  dscr: number;
  // Efficiency
  debtorDays: number;
  creditorDays: number;
  inventoryDays: number;
  workingCapitalCycle: number;
  assetTurnover: number;
  // Banking
  netWorth: number;
  totalDebt: number;
  workingCapital: number;
  mpbf: number;
  // Project Feasibility (Finline style)
  bep?: {
    variableCost: number;
    fixedCost: number;
    contribution: number;
    bepSales: number;
    bepCapacityPct: number;
  };
  npvIrr?: {
    discountRate: number;
    npv: number;
    irr: number;
    cashOutflow: number;
    cashInflow: number;
    netCashFlow: number;
  };
}

// ============================================================
// P&L CALCULATIONS
// ============================================================
export function computePLMetrics(pl: PLData): {
  netSales: number; grossProfit: number; ebitda: number; ebit: number; pbt: number; pat: number;
} {
  const netSales = pl.grossSales + pl.otherIncome;
  const grossProfit = netSales - pl.rawMaterial;
  const operatingExpenses = pl.salaryWages + pl.powerFuel + pl.manufacturingExp +
    pl.adminExp + pl.sellingExp + pl.rent + pl.repairMaintenance;
  const ebitda = grossProfit - operatingExpenses;
  const ebit = ebitda - pl.depreciation;
  const pbt = ebit - pl.interestExp;
  const pat = pbt - pl.taxExpense;
  return { netSales, grossProfit, ebitda, ebit, pbt, pat };
}

// ============================================================
// BALANCE SHEET CALCULATIONS
// ============================================================
export function computeBSMetrics(bs: BSData): {
  totalAssets: number; totalLiabilities: number;
  currentAssets: number; currentLiabilities: number;
  fixedAssets: number; netWorth: number; totalDebt: number;
} {
  const { assets, liabilities } = bs;

  const fixedAssets = (assets.landBuilding || 0) + (assets.plantMachinery || 0) +
    (assets.furniture || 0) + (assets.vehicle || 0);
  const currentAssets = (assets.inventory || 0) + (assets.sundryDebtors || 0) +
    (assets.cashBank || 0) + (assets.loansAdvances || 0) + (assets.otherCurrentAssets || 0);
  const totalAssets = fixedAssets + currentAssets + (assets.investments || 0);

  const netWorth = (liabilities.shareCapital || 0) + (liabilities.reserves || 0);
  const totalDebt = (liabilities.securedLoan || 0) + (liabilities.unsecuredLoan || 0) + (liabilities.ccOdLimit || 0);
  const currentLiabilities = (liabilities.ccOdLimit || 0) + (liabilities.tradeCreditors || 0) +
    (liabilities.otherCurrentLiab || 0) + (liabilities.provisions || 0);
  const totalLiabilities = netWorth + totalDebt + currentLiabilities;

  return { totalAssets, totalLiabilities, currentAssets, currentLiabilities, fixedAssets, netWorth, totalDebt };
}

// ============================================================
// RATIO CALCULATIONS (Standard Banking Formulas)
// ============================================================
export function computeRatios(pl: PLData, bs: BSData, loanInstallment = 0): FinancialRatios {
  const plMetrics = computePLMetrics(pl);
  const bsMetrics = computeBSMetrics(bs);
  const { netSales, grossProfit, ebitda, ebit, pat } = plMetrics;
  const { currentAssets, currentLiabilities, netWorth, totalDebt, fixedAssets } = bsMetrics;

  // Profitability
  const grossMarginPct = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const netMarginPct = netSales > 0 ? (pat / netSales) * 100 : 0;
  const ebitdaMarginPct = netSales > 0 ? (ebitda / netSales) * 100 : 0;

  // Liquidity
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quickAssets = currentAssets - (bs.assets.inventory || 0);
  const quickRatio = currentLiabilities > 0 ? quickAssets / currentLiabilities : 0;

  // Solvency
  const debtEquityRatio = netWorth > 0 ? totalDebt / netWorth : 0;
  const interestCoverageRatio = pl.interestExp > 0 ? ebitda / pl.interestExp : 0;

  // DSCR = (PAT + Depreciation + Interest) / (Loan Installment + Interest)
  const dscr = (loanInstallment + pl.interestExp) > 0
    ? (pat + pl.depreciation + pl.interestExp) / (loanInstallment + pl.interestExp)
    : 0;

  // Efficiency
  const debtorDays = netSales > 0 ? ((bs.assets.sundryDebtors || 0) / netSales) * 365 : 0;
  const creditorDays = (pl.rawMaterial + pl.manufacturingExp) > 0
    ? ((bs.liabilities.tradeCreditors || 0) / (pl.rawMaterial + pl.manufacturingExp)) * 365 : 0;
  const inventoryDays = pl.rawMaterial > 0 ? ((bs.assets.inventory || 0) / pl.rawMaterial) * 365 : 0;
  const workingCapitalCycle = debtorDays + inventoryDays - creditorDays;
  const totalAssets = fixedAssets + currentAssets + (bs.assets.investments || 0);
  const assetTurnover = totalAssets > 0 ? netSales / totalAssets : 0;

  // Working Capital & MPBF (Tandon Committee Method II)
  const workingCapital = currentAssets - currentLiabilities;
  // MPBF = 0.75 × (Current Assets − Core Current Liabilities)
  // Core Current Liabilities = Trade Creditors + Other CL (excluding bank CC)
  const coreCurrentLiab = (bs.liabilities.tradeCreditors || 0) + (bs.liabilities.otherCurrentLiab || 0);
  const mpbf = 0.75 * Math.max(0, currentAssets - coreCurrentLiab);

  return {
    grossMarginPct: round(grossMarginPct),
    netMarginPct: round(netMarginPct),
    ebitda: round(ebitda),
    ebitdaMarginPct: round(ebitdaMarginPct),
    ebit: round(ebit),
    pat: round(pat),
    currentRatio: round(currentRatio),
    quickRatio: round(quickRatio),
    debtEquityRatio: round(debtEquityRatio),
    interestCoverageRatio: round(interestCoverageRatio),
    dscr: round(dscr),
    debtorDays: round(debtorDays),
    creditorDays: round(creditorDays),
    inventoryDays: round(inventoryDays),
    workingCapitalCycle: round(workingCapitalCycle),
    assetTurnover: round(assetTurnover),
    netWorth: round(netWorth),
    totalDebt: round(totalDebt),
    workingCapital: round(workingCapital),
    mpbf: round(mpbf)
  };
}

// ============================================================
// LOAN SCHEDULE ENGINE (Reducing Balance Method)
// ============================================================
export function computeLoanSchedule(params: {
  loanAmount: number;
  annualRate: number;
  tenureMonths: number;
  moratoriumMonths: number;
}) {
  const { loanAmount, annualRate, tenureMonths, moratoriumMonths } = params;
  const monthlyRate = annualRate / 100 / 12;
  const repaymentMonths = tenureMonths - moratoriumMonths;

  // EMI using reducing balance formula
  const emi = repaymentMonths > 0 && monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, repaymentMonths)) /
      (Math.pow(1 + monthlyRate, repaymentMonths) - 1)
    : loanAmount / repaymentMonths;

  const schedule: Array<{
    month: number; openingBalance: number; interest: number;
    principal: number; emi: number; closingBalance: number; isMoratorium: boolean;
  }> = [];

  let balance = loanAmount;

  for (let month = 1; month <= tenureMonths; month++) {
    const interest = balance * monthlyRate;
    const isMoratorium = month <= moratoriumMonths;
    const principal = isMoratorium ? 0 : emi - interest;
    const actualEmi = isMoratorium ? interest : emi;
    const closingBalance = balance - (isMoratorium ? 0 : principal);

    schedule.push({
      month,
      openingBalance: round(balance),
      interest: round(interest),
      principal: round(Math.max(0, principal)),
      emi: round(actualEmi),
      closingBalance: round(Math.max(0, closingBalance)),
      isMoratorium
    });

    balance = closingBalance;
    if (balance < 0.01) break;
  }

  const annualSummary: Array<{
    year: number; principalRepaid: number; interestPaid: number; totalPayment: number; closingBalance: number;
  }> = [];
  for (let yr = 1; yr <= Math.ceil(tenureMonths / 12); yr++) {
    const yearMonths = schedule.filter(s => s.month > (yr - 1) * 12 && s.month <= yr * 12);
    annualSummary.push({
      year: yr,
      principalRepaid: round(yearMonths.reduce((sum, m) => sum + m.principal, 0)),
      interestPaid: round(yearMonths.reduce((sum, m) => sum + m.interest, 0)),
      totalPayment: round(yearMonths.reduce((sum, m) => sum + m.emi, 0)),
      closingBalance: round(yearMonths[yearMonths.length - 1]?.closingBalance || 0)
    });
  }

  return { emi: round(emi), schedule, annualSummary };
}

// ============================================================
// PROJECTION ENGINE
// ============================================================
export function computeProjections(params: {
  basePL: Partial<PLData>;
  baseBS: BSData;
  assumption: {
    salesGrowthPct: number; rawMaterialPct: number; salaryGrowthPct: number;
    adminExpensePct: number; powerExpensePct: number; interestRate: number;
    depreciationRate: number; taxRate: number; capacityUtilization: string;
    projectionYears: number;
  };
  report: { loanAmount?: number | null; interestRate?: number | null; loanTenure?: number | null; moratoriumMonths?: number | null; projectCost?: string | null };
}) {
  const { basePL, baseBS, assumption, report } = params;
  const capUtil: number[] = JSON.parse(assumption.capacityUtilization);
  const years = assumption.projectionYears;

  // Compute annual loan installment
  const loanInstallmentAnnual = report.loanAmount
    ? computeLoanSchedule({
        loanAmount: report.loanAmount,
        annualRate: report.interestRate || assumption.interestRate,
        tenureMonths: (report.loanTenure || 60),
        moratoriumMonths: report.moratoriumMonths || 0
      }).annualSummary[0]?.principalRepaid || 0
    : 0;

  const projections = [];
  let prevPL: PLData = {
    grossSales: basePL.grossSales || 0,
    otherIncome: basePL.otherIncome || 0,
    rawMaterial: basePL.rawMaterial || 0,
    salaryWages: basePL.salaryWages || 0,
    powerFuel: basePL.powerFuel || 0,
    manufacturingExp: basePL.manufacturingExp || 0,
    adminExp: basePL.adminExp || 0,
    sellingExp: basePL.sellingExp || 0,
    rent: basePL.rent || 0,
    repairMaintenance: basePL.repairMaintenance || 0,
    depreciation: basePL.depreciation || 0,
    interestExp: basePL.interestExp || 0,
    taxExpense: basePL.taxExpense || 0
  };
  let prevBS = baseBS;

  const currentYear = new Date().getFullYear();

  for (let i = 0; i < years; i++) {
    const growthFactor = 1 + assumption.salesGrowthPct / 100;
    const val = capUtil[i];
    const utilFactor = val !== undefined ? val / 100 : (0.7 + i * 0.05);

    const projectedSales = i === 0
      ? prevPL.grossSales * growthFactor * utilFactor
      : prevPL.grossSales * growthFactor;

    const pl: PLData = {
      grossSales: round(projectedSales),
      otherIncome: round(prevPL.otherIncome * (1 + 0.05)),
      rawMaterial: round(projectedSales * (assumption.rawMaterialPct / 100)),
      salaryWages: round(prevPL.salaryWages * (1 + assumption.salaryGrowthPct / 100)),
      powerFuel: round(projectedSales * (assumption.powerExpensePct / 100)),
      manufacturingExp: round(prevPL.manufacturingExp * 1.05),
      adminExp: round(projectedSales * (assumption.adminExpensePct / 100)),
      sellingExp: round(prevPL.sellingExp * 1.05),
      rent: round(prevPL.rent * 1.05),
      repairMaintenance: round(prevPL.repairMaintenance * 1.05),
      depreciation: round((prevBS.assets.plantMachinery + prevBS.assets.landBuilding + prevBS.assets.vehicle + prevBS.assets.furniture) * (assumption.depreciationRate / 100)),
      interestExp: round((report.loanAmount || 0) * (assumption.interestRate / 100) * (1 - i * 0.1)), // Declining as loan repays
      taxExpense: 0 // Computed below
    };

    const plMetrics = computePLMetrics(pl);
    pl.taxExpense = round(Math.max(0, plMetrics.pbt) * (assumption.taxRate / 100));

    // Project balance sheet (simplified)
    const fixedAssets = Object.values(prevBS.assets).slice(0, 4).reduce((a, b) => a + b, 0) -
      pl.depreciation + (i === 0 ? (report.loanAmount || 0) * 0.7 : 0); // Capex in year 1

    const projBS: BSData = {
      assets: {
        landBuilding: round(prevBS.assets.landBuilding * (1 - assumption.depreciationRate / 200)),
        plantMachinery: round(prevBS.assets.plantMachinery * (1 - assumption.depreciationRate / 100)),
        furniture: round(prevBS.assets.furniture * 0.9),
        vehicle: round(prevBS.assets.vehicle * 0.85),
        investments: prevBS.assets.investments,
        inventory: round(pl.rawMaterial * 60 / 365),
        sundryDebtors: round(pl.grossSales * 45 / 365),
        cashBank: round(Math.max(0, computePLMetrics(pl).pat + pl.depreciation) * 0.3),
        loansAdvances: prevBS.assets.loansAdvances,
        otherCurrentAssets: prevBS.assets.otherCurrentAssets
      },
      liabilities: {
        shareCapital: prevBS.liabilities.shareCapital,
        reserves: round((prevBS.liabilities.reserves || 0) + Math.max(0, computePLMetrics(pl).pat)),
        securedLoan: round(Math.max(0, (prevBS.liabilities.securedLoan || 0) - loanInstallmentAnnual)),
        unsecuredLoan: prevBS.liabilities.unsecuredLoan,
        ccOdLimit: round(pl.grossSales * 0.08), // 8% of sales as WC limit
        tradeCreditors: round(pl.rawMaterial * 30 / 365),
        otherCurrentLiab: prevBS.liabilities.otherCurrentLiab,
        provisions: round(pl.taxExpense * 0.5)
      }
    };

    const ratios = computeRatios(pl, projBS, loanInstallmentAnnual);

    // Cash Flow
    const plMetricsFull = computePLMetrics(pl);
    const cf = {
      operatingCashFlow: round(plMetricsFull.pat + pl.depreciation),
      investingCashFlow: round(i === 0 ? -(report.loanAmount || 0) * 0.7 : -pl.depreciation),
      financingCashFlow: round((i === 0 ? (report.loanAmount || 0) : 0) - loanInstallmentAnnual - pl.interestExp),
      netCashFlow: round(plMetricsFull.pat + pl.depreciation - loanInstallmentAnnual)
    };

    projections.push({
      year: `${currentYear + i}-${(currentYear + i + 1).toString().slice(-2)}`,
      pl,
      bs: projBS,
      cf,
      ratios
    });

    prevPL = pl;
    prevBS = projBS;
  }

  // Parse project cost to get initial outflow for NPV/IRR
  const projectCostObj = report.projectCost ? JSON.parse(report.projectCost) : {};
  const totalProjectCost = Object.values(projectCostObj).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) || report.loanAmount || 0;

  // Year 0 Cash Outflow = -totalProjectCost
  const projectCashFlows = [-totalProjectCost];
  for (let i = 0; i < projections.length; i++) {
    const pl = projections[i].pl;
    const metrics = computePLMetrics(pl);
    const pat = metrics.pat;
    const dep = pl.depreciation;
    const int = pl.interestExp;
    projectCashFlows.push(pat + dep + int);
  }

  const projectIRR = computeIRR(projectCashFlows);
  const projectNPV = computeNPV(0.10, projectCashFlows);

  // Now, inject bep and npvIrr into the ratios of each year
  for (let i = 0; i < projections.length; i++) {
    const pl = projections[i].pl;
    const bepVal = computeBEP(pl);

    projections[i].ratios = {
      ...projections[i].ratios,
      bep: bepVal,
      npvIrr: {
        discountRate: 10,
        npv: round(projectNPV),
        irr: round(projectIRR),
        cashOutflow: i === 0 ? round(totalProjectCost) : 0,
        cashInflow: round(projectCashFlows[i + 1]),
        netCashFlow: round(i === 0 ? projectCashFlows[i + 1] - totalProjectCost : projectCashFlows[i + 1])
      }
    };
  }

  return projections;
}

export function computeBEP(pl: PLData) {
  // Variable Costs: Raw Material + Power/Fuel + Mfg Exp + 40% of Salary/Wages + 40% of Admin Exp + 40% of Selling Exp
  const variableCost = (pl.rawMaterial || 0) + (pl.powerFuel || 0) + (pl.manufacturingExp || 0) +
    0.4 * (pl.salaryWages || 0) + 0.4 * (pl.adminExp || 0) + 0.4 * (pl.sellingExp || 0);

  const fixedCost = (pl.rent || 0) + (pl.depreciation || 0) + (pl.interestExp || 0) + (pl.repairMaintenance || 0) +
    0.6 * (pl.salaryWages || 0) + 0.6 * (pl.adminExp || 0) + 0.6 * (pl.sellingExp || 0);

  const totalSales = pl.grossSales || 0;
  const contribution = Math.max(0, totalSales - variableCost);
  const contributionRatio = totalSales > 0 ? contribution / totalSales : 0;
  const bepSales = contributionRatio > 0 ? fixedCost / contributionRatio : 0;
  const bepCapacityPct = totalSales > 0 ? (bepSales / totalSales) * 100 : 0;

  return {
    variableCost: round(variableCost),
    fixedCost: round(fixedCost),
    contribution: round(contribution),
    bepSales: round(bepSales),
    bepCapacityPct: round(Math.min(100, bepCapacityPct))
  };
}

export function computeNPV(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
}

export function computeIRR(cashFlows: number[]): number {
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);
  if (!hasPositive || !hasNegative) return 0;

  let low = -0.99;
  let high = 2.0;
  let npvLow = computeNPV(low, cashFlows);
  let npvHigh = computeNPV(high, cashFlows);

  // If high is not enough, expand it
  if (npvHigh > 0 && npvLow < 0) {
    while (npvHigh > 0 && high < 100) {
      high *= 2;
      npvHigh = computeNPV(high, cashFlows);
    }
  } else if (npvHigh < 0 && npvLow > 0) {
    while (npvHigh < 0 && high < 100) {
      high *= 2;
      npvHigh = computeNPV(high, cashFlows);
    }
  }

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const npvMid = computeNPV(mid, cashFlows);
    if (Math.abs(npvMid) < 0.0001) {
      return mid * 100;
    }
    if (npvMid * npvLow < 0) {
      high = mid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }
  return ((low + high) / 2) * 100;
}

function round(n: number, dp = 2): number {
  return Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);
}
