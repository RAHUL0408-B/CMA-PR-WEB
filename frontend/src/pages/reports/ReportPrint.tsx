import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const fmt = (n: any, dp = 2) => {
  const num = Number(n);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
};

export default function ReportPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [projectionsData, setProjectionsData] = useState<any>({ projections: [], loanSchedule: null });
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateType, setTemplateType] = useState<'CMA' | 'DPR' | 'COMBINED'>('CMA');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.reports.get(id),
      api.projections.get(id),
      api.ai.history(id)
    ])
      .then(([reportRes, projRes, aiRes]) => {
        setReport(reportRes);
        setProjectionsData(projRes);
        setAiLogs(aiRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (report) {
      setTemplateType(report.reportType === 'PROJECT_REPORT' ? 'DPR' : 'CMA');
    }
  }, [report]);

  // Extract latest AI commentaries for each module
  const aiCommentaries = useMemo(() => {
    return aiLogs.reduce((acc: Record<string, string>, log: any) => {
      if (log.module && !acc[log.module]) {
        acc[log.module] = log.response;
      }
      return acc;
    }, {});
  }, [aiLogs]);

  // Merge historical and projected years for comparative tables
  const combinedYears = useMemo(() => {
    if (!report) return [];
    const historical = (report.financialYears || []).map((y: any) => ({
      year: y.year,
      type: 'HISTORICAL',
      pl: y.plData ? JSON.parse(y.plData) : {},
      assets: y.bsAssets ? JSON.parse(y.bsAssets) : {},
      liabilities: y.bsLiabilities ? JSON.parse(y.bsLiabilities) : {},
      ratios: y.calculatedRatios ? JSON.parse(y.calculatedRatios) : {}
    }));
    
    const projected = (projectionsData.projections || []).map((p: any) => ({
      year: p.year,
      type: 'PROJECTED',
      pl: p.plProjection ? JSON.parse(p.plProjection) : {},
      assets: p.bsProjection ? JSON.parse(p.bsProjection) : {},
      liabilities: p.bsProjection ? JSON.parse(p.bsProjection) : {},
      ratios: p.ratios ? JSON.parse(p.ratios) : {}
    }));

    return [...historical, ...projected];
  }, [report, projectionsData]);

  // Project Cost & Means of Finance parsing
  const projectCost = useMemo(() => {
    if (!report?.projectCost) return {};
    return typeof report.projectCost === 'string' ? JSON.parse(report.projectCost) : report.projectCost;
  }, [report]);

  const meansOfFinance = useMemo(() => {
    if (!report?.meansOfFinance) return {};
    return typeof report.meansOfFinance === 'string' ? JSON.parse(report.meansOfFinance) : report.meansOfFinance;
  }, [report]);

  const totalProjectCost = useMemo(() => {
    return Object.values(projectCost).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }, [projectCost]);

  const totalMeansOfFinance = useMemo(() => {
    return Object.values(meansOfFinance).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }, [meansOfFinance]);

  // Cash Flow calculation logic
  const cashFlowStatementList = useMemo(() => {
    const list: any[] = [];
    if (combinedYears.length < 2) return list;

    for (let i = 1; i < combinedYears.length; i++) {
      const prev = combinedYears[i - 1]!;
      const curr = combinedYears[i]!;

      // Curr metrics
      const currSales = Number(curr.pl.grossSales) || 0;
      const currOther = Number(curr.pl.otherIncome) || 0;
      const currRaw = Number(curr.pl.rawMaterial) || 0;
      const currSalary = Number(curr.pl.salaryWages) || 0;
      const currPower = Number(curr.pl.powerFuel) || 0;
      const currMfg = Number(curr.pl.manufacturingExp) || 0;
      const currAdmin = Number(curr.pl.adminExp) || 0;
      const currSelling = Number(curr.pl.sellingExp) || 0;
      const currRent = Number(curr.pl.rent) || 0;
      const currRep = Number(curr.pl.repairMaintenance) || 0;
      const currDep = Number(curr.pl.depreciation) || 0;
      const currInt = Number(curr.pl.interestExp) || 0;
      const currTax = Number(curr.pl.taxExpense) || 0;
      const currPat = (currSales + currOther - currRaw) - (currSalary + currPower + currMfg + currAdmin + currSelling + currRent + currRep + currDep + currInt + currTax);

      // Balance Sheet deltas
      const dShare = (Number(curr.liabilities.shareCapital) || 0) - (Number(prev.liabilities.shareCapital) || 0);
      const dSecured = (Number(curr.liabilities.securedLoan) || 0) - (Number(prev.liabilities.securedLoan) || 0);
      const dUnsecured = (Number(curr.liabilities.unsecuredLoan) || 0) - (Number(prev.liabilities.unsecuredLoan) || 0);
      const dCreditors = (Number(curr.liabilities.tradeCreditors) || 0) - (Number(prev.liabilities.tradeCreditors) || 0);
      const dCc = (Number(curr.liabilities.ccOdLimit) || 0) - (Number(prev.liabilities.ccOdLimit) || 0);
      const dOcl = (Number(curr.liabilities.otherCurrentLiab) || 0) - (Number(prev.liabilities.otherCurrentLiab) || 0) + (Number(curr.liabilities.provisions) || 0) - (Number(prev.liabilities.provisions) || 0);

      const prevFA = (Number(prev.assets.landBuilding) || 0) + (Number(prev.assets.plantMachinery) || 0) + (Number(prev.assets.furniture) || 0) + (Number(prev.assets.vehicle) || 0);
      const currFA = (Number(curr.assets.landBuilding) || 0) + (Number(curr.assets.plantMachinery) || 0) + (Number(curr.assets.furniture) || 0) + (Number(curr.assets.vehicle) || 0);
      const dFixedAssets = currFA - prevFA;

      const dInventory = (Number(curr.assets.inventory) || 0) - (Number(prev.assets.inventory) || 0);
      const dDebtors = (Number(curr.assets.sundryDebtors) || 0) - (Number(prev.assets.sundryDebtors) || 0);
      const dInvest = (Number(curr.assets.investments) || 0) - (Number(prev.assets.investments) || 0);
      const dLoans = (Number(curr.assets.loansAdvances) || 0) - (Number(prev.assets.loansAdvances) || 0) + (Number(curr.assets.otherCurrentAssets) || 0) - (Number(prev.assets.otherCurrentAssets) || 0);

      const openingCash = Number(prev.assets.cashBank) || 0;
      const closingCash = Number(curr.assets.cashBank) || 0;

      const operatingCashBeforeWC = currPat + currDep;
      const wcChanges = (-dInventory) + (-dDebtors) + (-dLoans) + dCreditors + dOcl;
      const cfo = operatingCashBeforeWC + wcChanges;

      const capex = dFixedAssets + currDep;
      const cfi = (-capex) - dInvest;

      const cff = dShare + dSecured + dUnsecured + dCc;

      list.push({
        year: curr.year,
        openingCash,
        closingCash,
        operatingCashBeforeWC,
        wcChanges,
        cfo,
        cfi,
        cff,
        netCashFlow: cfo + cfi + cff
      });
    }
    return list;
  }, [combinedYears]);

  // Break-Even Point calculation logic
  const bepAnalysisList = useMemo(() => {
    const list: any[] = [];
    combinedYears.forEach(y => {
      const sales = Number(y.pl.grossSales) || 0;
      if (sales === 0) return;

      const raw = Number(y.pl.rawMaterial) || 0;
      const power = Number(y.pl.powerFuel) || 0;
      const mfg = Number(y.pl.manufacturingExp) || 0;
      
      const variableCosts = raw + power + mfg;
      
      const salary = Number(y.pl.salaryWages) || 0;
      const admin = Number(y.pl.adminExp) || 0;
      const selling = Number(y.pl.sellingExp) || 0;
      const rent = Number(y.pl.rent) || 0;
      const repair = Number(y.pl.repairMaintenance) || 0;
      const dep = Number(y.pl.depreciation) || 0;
      const interest = Number(y.pl.interestExp) || 0;
      
      const fixedCosts = salary + admin + selling + rent + repair + dep + interest;

      const contribution = sales - variableCosts;
      const contributionRatio = contribution / sales;
      const breakEvenSales = contributionRatio > 0 ? fixedCosts / contributionRatio : 0;
      const breakEvenPercent = sales > 0 ? (breakEvenSales / sales) * 100 : 0;

      list.push({
        year: y.year,
        sales,
        variableCosts,
        fixedCosts,
        contribution,
        breakEvenSales,
        breakEvenPercent
      });
    });
    return list;
  }, [combinedYears]);

  // Capital Budgeting calculation logic (IRR & NPV)
  const capitalBudgetingData = useMemo(() => {
    const projYears = combinedYears.filter(y => y.type === 'PROJECTION');
    if (projYears.length === 0 || totalProjectCost === 0) {
      return { projYears: [], cashFlows: [], npvVal: 0, irrVal: 0, discountRate: 12 };
    }

    const cashFlows: number[] = [-totalProjectCost];
    projYears.forEach(y => {
      const sales = Number(y.pl.grossSales) || 0;
      const other = Number(y.pl.otherIncome) || 0;
      const raw = Number(y.pl.rawMaterial) || 0;
      const salary = Number(y.pl.salaryWages) || 0;
      const power = Number(y.pl.powerFuel) || 0;
      const mfg = Number(y.pl.manufacturingExp) || 0;
      const admin = Number(y.pl.adminExp) || 0;
      const selling = Number(y.pl.sellingExp) || 0;
      const rent = Number(y.pl.rent) || 0;
      const repair = Number(y.pl.repairMaintenance) || 0;
      const dep = Number(y.pl.depreciation) || 0;
      const interest = Number(y.pl.interestExp) || 0;
      const tax = Number(y.pl.taxExpense) || 0;
      const pat = (sales + other - raw) - (salary + power + mfg + admin + selling + rent + repair + dep + interest + tax);
      
      const inflow = pat + dep + interest;
      cashFlows.push(inflow);
    });

    const discountRate = 12;
    const r = discountRate / 100;
    
    let npvVal = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      npvVal += cashFlows[i] / Math.pow(1 + r, i);
    }

    const calculateIrr = (flows: number[]) => {
      let low = -0.99;
      let high = 2.0;
      for (let i = 0; i < 100; i++) {
        let mid = (low + high) / 2;
        let npv = 0;
        for (let j = 0; j < flows.length; j++) {
          npv += flows[j] / Math.pow(1 + mid, j);
        }
        if (Math.abs(npv) < 1e-5) {
          return mid * 100;
        }
        if (npv > 0) {
          if (flows[0] < 0) {
            high = mid;
          } else {
            low = mid;
          }
        } else {
          if (flows[0] < 0) {
            low = mid;
          } else {
            high = mid;
          }
        }
      }
      return ((low + high) / 2) * 100;
    };

    const irrVal = calculateIrr(cashFlows);

    return {
      projYears,
      cashFlows,
      npvVal,
      irrVal,
      discountRate
    };
  }, [combinedYears, totalProjectCost]);

  // Fund Flow calculation logic (Statement VI)
  const fundFlowList = useMemo(() => {
    const list: any[] = [];
    if (combinedYears.length < 2) return list;

    for (let i = 1; i < combinedYears.length; i++) {
      const prev = combinedYears[i - 1]!;
      const curr = combinedYears[i]!;

      // Curr metrics
      const currSales = Number(curr.pl.grossSales) || 0;
      const currOther = Number(curr.pl.otherIncome) || 0;
      const currRaw = Number(curr.pl.rawMaterial) || 0;
      const currSalary = Number(curr.pl.salaryWages) || 0;
      const currPower = Number(curr.pl.powerFuel) || 0;
      const currMfg = Number(curr.pl.manufacturingExp) || 0;
      const currAdmin = Number(curr.pl.adminExp) || 0;
      const currSelling = Number(curr.pl.sellingExp) || 0;
      const currRent = Number(curr.pl.rent) || 0;
      const currRep = Number(curr.pl.repairMaintenance) || 0;
      const currDep = Number(curr.pl.depreciation) || 0;
      const currInt = Number(curr.pl.interestExp) || 0;
      const currTax = Number(curr.pl.taxExpense) || 0;
      const currPat = (currSales + currOther - currRaw) - (currSalary + currPower + currMfg + currAdmin + currSelling + currRent + currRep + currDep + currInt + currTax);

      // Liabilities changes
      const dShare = (Number(curr.liabilities.shareCapital) || 0) - (Number(prev.liabilities.shareCapital) || 0);
      const dSecured = (Number(curr.liabilities.securedLoan) || 0) - (Number(prev.liabilities.securedLoan) || 0);
      const dUnsecured = (Number(curr.liabilities.unsecuredLoan) || 0) - (Number(prev.liabilities.unsecuredLoan) || 0);
      const dCreditors = (Number(curr.liabilities.tradeCreditors) || 0) - (Number(prev.liabilities.tradeCreditors) || 0);
      const dCc = (Number(curr.liabilities.ccOdLimit) || 0) - (Number(prev.liabilities.ccOdLimit) || 0);
      const dOcl = (Number(curr.liabilities.otherCurrentLiab) || 0) - (Number(prev.liabilities.otherCurrentLiab) || 0) + (Number(curr.liabilities.provisions) || 0) - (Number(prev.liabilities.provisions) || 0);

      // Assets changes
      const prevFA = (Number(prev.assets.landBuilding) || 0) + (Number(prev.assets.plantMachinery) || 0) + (Number(prev.assets.furniture) || 0) + (Number(prev.assets.vehicle) || 0);
      const currFA = (Number(curr.assets.landBuilding) || 0) + (Number(curr.assets.plantMachinery) || 0) + (Number(curr.assets.furniture) || 0) + (Number(curr.assets.vehicle) || 0);
      const dFixedAssets = currFA - prevFA;

      const dInventory = (Number(curr.assets.inventory) || 0) - (Number(prev.assets.inventory) || 0);
      const dDebtors = (Number(curr.assets.sundryDebtors) || 0) - (Number(prev.assets.sundryDebtors) || 0);
      const dCash = (Number(curr.assets.cashBank) || 0) - (Number(prev.assets.cashBank) || 0);
      const dInvest = (Number(curr.assets.investments) || 0) - (Number(prev.assets.investments) || 0);
      const dLoans = (Number(curr.assets.loansAdvances) || 0) - (Number(prev.assets.loansAdvances) || 0) + (Number(curr.assets.otherCurrentAssets) || 0) - (Number(prev.assets.otherCurrentAssets) || 0);

      // Group sources vs applications
      const sources: any[] = [];
      const applications: any[] = [];

      // Capital/Reserves/PAT
      sources.push({ label: 'Net Profit (PAT)', value: Math.max(0, currPat) });
      sources.push({ label: 'Depreciation (Non-Cash Addback)', value: currDep });
      if (dShare > 0) sources.push({ label: 'Increase in Share Capital', value: dShare });
      if (dShare < 0) applications.push({ label: 'Decrease in Share Capital', value: -dShare });

      // Loans
      if (dSecured > 0) sources.push({ label: 'Increase in Secured Loans', value: dSecured });
      if (dSecured < 0) applications.push({ label: 'Repayment of Secured Loans', value: -dSecured });
      if (dUnsecured > 0) sources.push({ label: 'Increase in Unsecured Loans', value: dUnsecured });
      if (dUnsecured < 0) applications.push({ label: 'Repayment of Unsecured Loans', value: -dUnsecured });

      // Fixed assets (Gross capex)
      const capex = dFixedAssets + currDep;
      if (capex > 0) applications.push({ label: 'Capital Expenditure (Capex)', value: capex });
      if (capex < 0) sources.push({ label: 'Sale of Fixed Assets', value: -capex });

      // Investments
      if (dInvest > 0) applications.push({ label: 'Increase in Long-Term Investments', value: dInvest });
      if (dInvest < 0) sources.push({ label: 'Realization of Long-Term Investments', value: -dInvest });

      // Working Capital changes
      if (dCc > 0) sources.push({ label: 'Increase in Bank borrowings (CC/OD)', value: dCc });
      if (dCc < 0) applications.push({ label: 'Decrease in Bank borrowings (CC/OD)', value: -dCc });

      if (dInventory > 0) applications.push({ label: 'Increase in Inventory', value: dInventory });
      if (dInventory < 0) sources.push({ label: 'Decrease in Inventory', value: -dInventory });

      if (dDebtors > 0) applications.push({ label: 'Increase in Trade Receivables', value: dDebtors });
      if (dDebtors < 0) sources.push({ label: 'Decrease in Trade Receivables', value: -dDebtors });

      if (dCreditors > 0) sources.push({ label: 'Increase in Trade Payables', value: dCreditors });
      if (dCreditors < 0) applications.push({ label: 'Decrease in Trade Payables', value: -dCreditors });

      if (dOcl > 0) sources.push({ label: 'Increase in Other Current Liabilities', value: dOcl });
      if (dOcl < 0) applications.push({ label: 'Decrease in Other Current Liabilities', value: -dOcl });

      if (dLoans > 0) applications.push({ label: 'Increase in Loans & Advances (Assets)', value: dLoans });
      if (dLoans < 0) sources.push({ label: 'Decrease in Loans & Advances (Assets)', value: -dLoans });

      if (dCash > 0) applications.push({ label: 'Increase in Cash & Bank Balances', value: dCash });
      if (dCash < 0) sources.push({ label: 'Decrease in Cash & Bank Balances', value: -dCash });

      const totalSources = sources.reduce((a, b) => a + b.value, 0);
      const totalApps = applications.reduce((a, b) => a + b.value, 0);

      list.push({
        year: curr.year,
        sources,
        applications,
        totalSources,
        totalApps
      });
    }
    return list;
  }, [combinedYears]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Formatting Bank-Ready CMA Report...</span>
    </div>
  );

  if (!report) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>Report not found</div>;

  const client = report.client || {};

  return (
    <div className="print-report-wrapper">
      {/* Action Header (Hidden in Print) */}
      <div className="no-print print-actions-bar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/reports/${id}`)}>
            ← Back to Workspace
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => window.print()} style={{ background: '#7c3aed', border: 'none' }}>
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', width: '100%' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginRight: 12 }}>Select Report Template Layout:</span>
          <button 
            className="btn" 
            onClick={() => setTemplateType('CMA')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              fontWeight: 600,
              background: templateType === 'CMA' ? '#1e3a8a' : '#ffffff',
              color: templateType === 'CMA' ? '#ffffff' : '#475569',
              border: '1px solid ' + (templateType === 'CMA' ? '#1e3a8a' : '#cbd5e1'),
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📋 CMA e-Report
          </button>
          <button 
            className="btn" 
            onClick={() => setTemplateType('DPR')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              fontWeight: 600,
              background: templateType === 'DPR' ? '#10b981' : '#ffffff',
              color: templateType === 'DPR' ? '#ffffff' : '#475569',
              border: '1px solid ' + (templateType === 'DPR' ? '#10b981' : '#cbd5e1'),
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📊 Project Report (DPR)
          </button>
          <button 
            className="btn" 
            onClick={() => setTemplateType('COMBINED')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              fontWeight: 600,
              background: templateType === 'COMBINED' ? '#7c3aed' : '#ffffff',
              color: templateType === 'COMBINED' ? '#ffffff' : '#475569',
              border: '1px solid ' + (templateType === 'COMBINED' ? '#7c3aed' : '#cbd5e1'),
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ✨ Combined Report
          </button>
        </div>
      </div>

      {/* Page 1: Cover Page */}
      <div className="print-page cover-page">
        <div className="cover-border">
          <div className="cover-header">
            <div className="cover-org">CMA PRO AI · FINANCIAL UNDERWRITING SERVICE</div>
            <div className="cover-title">
              {templateType === 'DPR' ? 'DETAILED PROJECT REPORT (DPR)' : 'CREDIT APPRAISAL & CMA REPORT'}
            </div>
            <div className="cover-subtitle">Detailed Project Report (DPR) and Financial Projections</div>
          </div>

          <div className="cover-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Prepared For</span>
              <span className="meta-value">M/s {client.businessName || client.name}</span>
              {client.address && <span className="meta-subvalue">{client.address}</span>}
            </div>

            <div className="meta-item">
              <span className="meta-label">Financial Institution</span>
              <span className="meta-value">{report.bankName || 'The Bank / Lending Institution'}</span>
            </div>

            <div className="meta-item">
              <span className="meta-label">Requested Credit Facility</span>
              <span className="meta-value">₹{report.loanAmount ? fmt(report.loanAmount, 2) : '0.00'} Lakhs</span>
              <span className="meta-subvalue">Facility Type: {report.loanType || 'Term Loan / CC'}</span>
            </div>

            <div className="meta-item">
              <span className="meta-label">Report Date</span>
              <span className="meta-value">{new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
            </div>
          </div>

          <div className="cover-footer">
            <div style={{ fontWeight: 700, color: '#1e293b' }}>Prepared & Audited by CMA Pro AI</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>This appraisal incorporates standard banking norms, debt-service coverage appraisal, and financial sensitivity metrics.</div>
          </div>
        </div>
      </div>

      {/* Page 2: Promoters' SWOT & Executive Summary */}
      <div className="print-page">
        <h2 className="report-h1">I. Project Profile & Executive Summary</h2>
        
        <div className="details-card">
          <h3 className="section-sub">1.1 Business Profile</h3>
          <table className="profile-table">
            <tbody>
              <tr>
                <td><strong>Business Name:</strong></td>
                <td>M/s {client.businessName || client.name}</td>
                <td><strong>Registration Type:</strong></td>
                <td>{client.constitution || 'Proprietorship'}</td>
              </tr>
              <tr>
                <td><strong>Promoter Name:</strong></td>
                <td>{client.promoterName || client.name}</td>
                <td><strong>Experience:</strong></td>
                <td>{client.promoterExperience ? `${client.promoterExperience} Years` : '—'}</td>
              </tr>
              <tr>
                <td><strong>Activity/Industry:</strong></td>
                <td>{client.businessActivity || client.industryType || 'Manufacturing/Service'}</td>
                <td><strong>Employment Count:</strong></td>
                <td>{client.employeeCount || '—'} Employees</td>
              </tr>
              <tr>
                <td><strong>Location Class:</strong></td>
                <td>{client.cityType === 'RURAL' ? 'Rural (Panchayath/Village)' : 'Urban (Town/Municipality)'}</td>
                <td><strong>Contact Email:</strong></td>
                <td>{client.email || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 className="section-sub">1.2 Executive Narrative (AI Analysis)</h3>
          {aiCommentaries.executive_summary ? (
            <p className="narrative-p">{aiCommentaries.executive_summary}</p>
          ) : (
            <p className="narrative-p-placeholder">Executive summary commentary not yet generated in the workspace. Navigate to the AI Commentary tab to compile.</p>
          )}
        </div>

        {(templateType === 'DPR' || templateType === 'COMBINED') && aiCommentaries.swot_analysis && (
          <div style={{ marginTop: 24 }}>
            <h3 className="section-sub">1.3 SWOT Matrix</h3>
            <div className="swot-grid">
              <div className="swot-box">
                <strong>Strengths / Opportunities:</strong>
                <p style={{ fontSize: '11px', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                  {aiCommentaries.swot_analysis.split(/weakness/i)[0] || aiCommentaries.swot_analysis}
                </p>
              </div>
              <div className="swot-box">
                <strong>Weaknesses / Threats:</strong>
                <p style={{ fontSize: '11px', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                  {aiCommentaries.swot_analysis.split(/weakness/i)[1] ? `Weakness${aiCommentaries.swot_analysis.split(/weakness/i)[1]}` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Page 3: Project Cost & Means of Finance */}
      {(templateType === 'DPR' || templateType === 'COMBINED') && (
        <div className="print-page">
          <h2 className="report-h1">II. Project Cost & Means of Finance</h2>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Detailed capital expenditure (CAPEX) projections and matching financial allocations (in ₹ Lakhs).</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 24 }}>
            {/* Project Cost Table */}
            <div>
              <h3 className="section-sub">2.1 Detailed Project Cost</h3>
              <table className="print-data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>CAPEX Item</th>
                    <th style={{ textAlign: 'right', width: '35%' }}>Amount (₹ L)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Land Cost</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.landCost || 0)}</td></tr>
                  <tr><td>Building / Civil Work</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.buildingCost || 0)}</td></tr>
                  <tr><td>Plant & Machinery</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.plantMachinery || 0)}</td></tr>
                  <tr><td>Furniture & Fixtures</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.furniture || 0)}</td></tr>
                  <tr><td>Office Equipment</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.officeEquipment || 0)}</td></tr>
                  <tr><td>Vehicle Cost</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.vehicle || 0)}</td></tr>
                  <tr><td>Electrical Installation</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.electricalInstallation || 0)}</td></tr>
                  <tr><td>Software / ERP Cost</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.softwareCost || 0)}</td></tr>
                  <tr><td>Preliminary Expenses</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.preliminaryExpenses || 0)}</td></tr>
                  <tr><td>Pre-Operative Expenses</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.preOperativeExpenses || 0)}</td></tr>
                  <tr><td>Contingency Expenses</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.contingency || 0)}</td></tr>
                  <tr><td>Working Capital Margin</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.workingCapitalMargin || 0)}</td></tr>
                  <tr><td>Other Project Costs</td><td style={{ textAlign: 'right' }}>{fmt(projectCost.other || 0)}</td></tr>
                  <tr className="subtotal-row">
                    <td>Total Project Cost</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e3a8a' }}>₹{fmt(totalProjectCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Means of Finance Table */}
            <div>
              <h3 className="section-sub">2.2 Means of Finance</h3>
              <table className="print-data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Financing Source</th>
                    <th style={{ textAlign: 'right', width: '35%' }}>Amount (₹ L)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Promoter Contribution (Equity)</td><td style={{ textAlign: 'right' }}>{fmt(meansOfFinance.promoterContribution || 0)}</td></tr>
                  <tr><td>Unsecured Loan / Director Loan</td><td style={{ textAlign: 'right' }}>{fmt(meansOfFinance.unsecuredLoan || 0)}</td></tr>
                  <tr><td>Subsidy / Grant Amount</td><td style={{ textAlign: 'right' }}>{fmt(meansOfFinance.subsidy || 0)}</td></tr>
                  <tr><td>Term Loan (Proposed)</td><td style={{ textAlign: 'right' }}>{fmt(meansOfFinance.termLoan || 0)}</td></tr>
                  <tr><td>Working Capital Loan</td><td style={{ textAlign: 'right' }}>{fmt(meansOfFinance.workingCapital || 0)}</td></tr>
                  <tr><td>Other Sources</td><td style={{ textAlign: 'right' }}>{fmt(meansOfFinance.other || 0)}</td></tr>
                  {/* Spacer padding rows */}
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr className="subtotal-row">
                    <td>Total Sources of Finance</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>₹{fmt(totalMeansOfFinance)}</td>
                  </tr>
                </tbody>
              </table>

              {Math.abs(totalProjectCost - totalMeansOfFinance) >= 1 ? (
                <div className="alert alert-error" style={{ fontSize: 11, padding: '10px 14px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', marginTop: 12 }}>
                  <strong>⚠ Warning:</strong> Means of Finance (₹{fmt(totalMeansOfFinance)} L) does not balance with Project Cost (₹{fmt(totalProjectCost)} L). Difference: ₹{fmt(Math.abs(totalProjectCost - totalMeansOfFinance))} L.
                </div>
              ) : (
                <div className="alert alert-success" style={{ fontSize: 11, padding: '10px 14px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', marginTop: 12 }}>
                  <strong>✓ Balanced:</strong> Sources of finance exactly match total projected cost.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page 4: Statement I - Particulars of Limits & Repayment terms */}
      {(templateType === 'CMA' || templateType === 'COMBINED') && (
        <div className="print-page">
          <h2 className="report-h1">CMA Statement I: Particulars of Limits & Repayment Terms</h2>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Appraisal of banking limits requested and repayments (in ₹ Lakhs).</div>

          <table className="print-data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Lending Bank</th>
                <th style={{ textAlign: 'left' }}>Facility Type</th>
                <th style={{ textAlign: 'center' }}>Rate (% p.a.)</th>
                <th style={{ textAlign: 'center' }}>Tenure (Months)</th>
                <th style={{ textAlign: 'center' }}>Moratorium</th>
                <th style={{ textAlign: 'right' }}>Amount Requested</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>{report.bankName || 'Proposed Bank'}</td>
                <td>{report.loanType || 'Term Loan / Cash Credit'}</td>
                <td style={{ textAlign: 'center' }}>{report.interestRate ? `${report.interestRate}%` : '—'}</td>
                <td style={{ textAlign: 'center' }}>{report.loanTenure ? `${report.loanTenure} M` : '—'}</td>
                <td style={{ textAlign: 'center' }}>{report.moratoriumMonths ? `${report.moratoriumMonths} M` : '0 M'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{report.loanAmount ? fmt(report.loanAmount) : '0.00'} L</td>
              </tr>
              <tr className="subtotal-row">
                <td colSpan={5}>Total Requested Limits</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e3a8a' }}>₹{report.loanAmount ? fmt(report.loanAmount) : '0.00'} L</td>
              </tr>
            </tbody>
          </table>

          {report.loanPurpose && (
            <div className="details-card" style={{ marginTop: 24 }}>
              <h3 className="section-sub">Purpose / Objective of Facility</h3>
              <p className="narrative-p" style={{ margin: 0 }}>{report.loanPurpose}</p>
            </div>
          )}
        </div>
      )}

      {/* Page 5: Operating Statement / P&L */}
      <div className="print-page">
        <h2 className="report-h1">{templateType === 'DPR' ? 'Projected Profitability (P&L) Statement' : 'CMA Statement II: Operating Statement (P&L)'}</h2>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Comparative analysis of sales, operational expenditures, and margins (in ₹ Lakhs).</div>
        
        <table className="print-data-table pl-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '35%' }}>Particulars</th>
              {combinedYears.map(y => (
                <th key={y.year} style={{ textAlign: 'right' }}>
                  {y.year} {y.type === 'HISTORICAL' ? '(A)' : '(P)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>INCOME</td></tr>
            <tr>
              <td>Gross Sales / Turnover</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.grossSales)}</td>)}
            </tr>
            <tr>
              <td>Other Income</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.otherIncome)}</td>)}
            </tr>
            <tr className="subtotal-row">
              <td>Total Income (A)</td>
              {combinedYears.map(y => {
                const tot = (Number(y.pl.grossSales) || 0) + (Number(y.pl.otherIncome) || 0);
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(tot)}</td>;
              })}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>DIRECT COST OF SALES</td></tr>
            <tr>
              <td>Raw Material / Purchase Costs</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.rawMaterial)}</td>)}
            </tr>
            <tr>
              <td>Salary & Wages</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.salaryWages)}</td>)}
            </tr>
            <tr>
              <td>Power & Fuel</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.powerFuel)}</td>)}
            </tr>
            <tr>
              <td>Manufacturing & Consumables</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.manufacturingExp)}</td>)}
            </tr>
            <tr className="subtotal-row">
              <td>Total Cost of Sales (B)</td>
              {combinedYears.map(y => {
                const raw = Number(y.pl.rawMaterial) || 0;
                const salary = Number(y.pl.salaryWages) || 0;
                const power = Number(y.pl.powerFuel) || 0;
                const mfg = Number(y.pl.manufacturingExp) || 0;
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(raw + salary + power + mfg)}</td>;
              })}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>INDIRECT / OPERATING EXPENSES</td></tr>
            <tr>
              <td>Rent, Rates & Taxes</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.rent)}</td>)}
            </tr>
            <tr>
              <td>Repairs & Maintenance</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.repairMaintenance)}</td>)}
            </tr>
            <tr>
              <td>Selling & Admin Expenses</td>
              {combinedYears.map(y => {
                const admin = Number(y.pl.adminExp) || 0;
                const selling = Number(y.pl.sellingExp) || 0;
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(admin + selling)}</td>;
              })}
            </tr>
            <tr className="subtotal-row">
              <td>EBITDA (A - B - Indirects)</td>
              {combinedYears.map(y => {
                const sales = Number(y.pl.grossSales) || 0;
                const other = Number(y.pl.otherIncome) || 0;
                const raw = Number(y.pl.rawMaterial) || 0;
                const salary = Number(y.pl.salaryWages) || 0;
                const power = Number(y.pl.powerFuel) || 0;
                const mfg = Number(y.pl.manufacturingExp) || 0;
                const admin = Number(y.pl.adminExp) || 0;
                const selling = Number(y.pl.sellingExp) || 0;
                const rent = Number(y.pl.rent) || 0;
                const repair = Number(y.pl.repairMaintenance) || 0;
                const ebitdaVal = (sales + other - raw) - (salary + power + mfg + admin + selling + rent + repair);
                return <td key={y.year} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(ebitdaVal)}</td>;
              })}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>FINANCIAL CHARGES & TAXES</td></tr>
            <tr>
              <td>Depreciation</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.depreciation)}</td>)}
            </tr>
            <tr>
              <td>Interest & Finance Charges</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.interestExp)}</td>)}
            </tr>
            <tr>
              <td>Income Tax Provisions</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.pl.taxExpense)}</td>)}
            </tr>
            <tr className="netprofit-row">
              <td>Net Profit (PAT)</td>
              {combinedYears.map(y => {
                const sales = Number(y.pl.grossSales) || 0;
                const other = Number(y.pl.otherIncome) || 0;
                const raw = Number(y.pl.rawMaterial) || 0;
                const salary = Number(y.pl.salaryWages) || 0;
                const power = Number(y.pl.powerFuel) || 0;
                const mfg = Number(y.pl.manufacturingExp) || 0;
                const admin = Number(y.pl.adminExp) || 0;
                const selling = Number(y.pl.sellingExp) || 0;
                const rent = Number(y.pl.rent) || 0;
                const repair = Number(y.pl.repairMaintenance) || 0;
                const dep = Number(y.pl.depreciation) || 0;
                const interest = Number(y.pl.interestExp) || 0;
                const tax = Number(y.pl.taxExpense) || 0;
                
                const patVal = (sales + other - raw) - (salary + power + mfg + admin + selling + rent + repair + dep + interest + tax);
                return <td key={y.year} style={{ textAlign: 'right', fontWeight: 800, color: '#166534' }}>{fmt(patVal)}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page 6: Balance Sheet Statement */}
      <div className="print-page">
        <h2 className="report-h1">{templateType === 'DPR' ? 'Projected Balance Sheet Statement' : 'CMA Statement III: Balance Sheet Statement'}</h2>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Comparative analysis of net worth, term liabilities, and asset structure (in ₹ Lakhs).</div>
        
        <table className="print-data-table bs-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '35%' }}>Liabilities & Net Worth</th>
              {combinedYears.map(y => <th key={y.year} style={{ textAlign: 'right' }}>{y.year}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>NET WORTH (PROMOTER'S FUND)</td></tr>
            <tr>
              <td>Share Capital / Owner's Contribution</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.shareCapital)}</td>)}
            </tr>
            <tr>
              <td>Reserves & Surplus</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.reserves)}</td>)}
            </tr>
            <tr className="subtotal-row">
              <td>Total Net Worth</td>
              {combinedYears.map(y => {
                const cap = Number(y.liabilities?.shareCapital) || 0;
                const res = Number(y.liabilities?.reserves) || 0;
                return <td key={y.year} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(cap + res)}</td>;
              })}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>LONG-TERM LIABILITIES</td></tr>
            <tr>
              <td>Secured Loans (Term Loans)</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.securedLoan)}</td>)}
            </tr>
            <tr>
              <td>Unsecured Loans</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.unsecuredLoan)}</td>)}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>CURRENT LIABILITIES</td></tr>
            <tr>
              <td>Short Term Borrowings (Bank CC/OD)</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.ccOdLimit)}</td>)}
            </tr>
            <tr>
              <td>Trade Creditors (Sundry Creditors)</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.tradeCreditors)}</td>)}
            </tr>
            <tr>
              <td>Other Current Liabilities & Provisions</td>
              {combinedYears.map(y => {
                const ocl = Number(y.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(y.liabilities?.provisions) || 0;
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(ocl + prov)}</td>;
              })}
            </tr>
            <tr className="subtotal-row" style={{ background: '#f8fafc' }}>
              <td>Total Liabilities & Equity</td>
              {combinedYears.map(y => {
                const cap = Number(y.liabilities?.shareCapital) || 0;
                const res = Number(y.liabilities?.reserves) || 0;
                const secured = Number(y.liabilities?.securedLoan) || 0;
                const unsecured = Number(y.liabilities?.unsecuredLoan) || 0;
                const cc = Number(y.liabilities?.ccOdLimit) || 0;
                const cred = Number(y.liabilities?.tradeCreditors) || 0;
                const ocl = Number(y.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(y.liabilities?.provisions) || 0;
                return <td key={y.year} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(cap + res + secured + unsecured + cc + cred + ocl + prov)}</td>;
              })}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>FIXED & NON-CURRENT ASSETS</td></tr>
            <tr>
              <td>Fixed Assets (Net of Dep.)</td>
              {combinedYears.map(y => {
                const lb = Number(y.assets?.landBuilding) || 0;
                const pm = Number(y.assets?.plantMachinery) || 0;
                const fur = Number(y.assets?.furniture) || 0;
                const veh = Number(y.assets?.vehicle) || 0;
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(lb + pm + fur + veh)}</td>;
              })}
            </tr>
            <tr>
              <td>Non-Current Investments</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.assets?.investments)}</td>)}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>CURRENT ASSETS</td></tr>
            <tr>
              <td>Closing Inventory</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.assets?.inventory)}</td>)}
            </tr>
            <tr>
              <td>Sundry Debtors / Receivables</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.assets?.sundryDebtors)}</td>)}
            </tr>
            <tr>
              <td>Cash & Bank Balances</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.assets?.cashBank)}</td>)}
            </tr>
            <tr>
              <td>Other Current Assets (Loans & Advances)</td>
              {combinedYears.map(y => {
                const loans = Number(y.assets?.loansAdvances) || 0;
                const oca = Number(y.assets?.otherCurrentAssets) || 0;
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(loans + oca)}</td>;
              })}
            </tr>
            <tr className="subtotal-row" style={{ background: '#f8fafc' }}>
              <td>Total Assets</td>
              {combinedYears.map(y => {
                const lb = Number(y.assets?.landBuilding) || 0;
                const pm = Number(y.assets?.plantMachinery) || 0;
                const fur = Number(y.assets?.furniture) || 0;
                const veh = Number(y.assets?.vehicle) || 0;
                const inv = Number(y.assets?.inventory) || 0;
                const debtors = Number(y.assets?.sundryDebtors) || 0;
                const cash = Number(y.assets?.cashBank) || 0;
                const investments = Number(y.assets?.investments) || 0;
                const loans = Number(y.assets?.loansAdvances) || 0;
                const oca = Number(y.assets?.otherCurrentAssets) || 0;
                return <td key={y.year} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(lb + pm + fur + veh + inv + debtors + cash + investments + loans + oca)}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page 7: CMA Statement IV - Working Capital Assessment */}
      {(templateType === 'CMA' || templateType === 'COMBINED') && (
        <div className="print-page">
          <h2 className="report-h1">CMA Statement IV: Working Capital Assessment</h2>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Analysis of operating cycle, liquidity requirements, and current assets turnover (in ₹ Lakhs).</div>

        <table className="print-data-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '35%' }}>Working Capital Components</th>
              {combinedYears.map(y => <th key={y.year} style={{ textAlign: 'right' }}>{y.year}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>A. CURRENT ASSETS</td></tr>
            <tr>
              <td>Inventory</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.assets?.inventory)}</td>)}
            </tr>
            <tr>
              <td>Sundry Debtors / Receivables</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.assets?.sundryDebtors)}</td>)}
            </tr>
            <tr>
              <td>Cash & Bank Balances</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.assets?.cashBank)}</td>)}
            </tr>
            <tr>
              <td>Other Current Assets & Advances</td>
              {combinedYears.map(y => {
                const loans = Number(y.assets?.loansAdvances) || 0;
                const oca = Number(y.assets?.otherCurrentAssets) || 0;
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(loans + oca)}</td>;
              })}
            </tr>
            <tr className="subtotal-row">
              <td>Total Current Assets (I)</td>
              {combinedYears.map(y => {
                const inv = Number(y.assets?.inventory) || 0;
                const debtors = Number(y.assets?.sundryDebtors) || 0;
                const cash = Number(y.assets?.cashBank) || 0;
                const loans = Number(y.assets?.loansAdvances) || 0;
                const oca = Number(y.assets?.otherCurrentAssets) || 0;
                return <td key={y.year} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(inv + debtors + cash + loans + oca)}</td>;
              })}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>B. CURRENT LIABILITIES (EXCLUDING CC LIMIT)</td></tr>
            <tr>
              <td>Trade Creditors / Payables</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.tradeCreditors)}</td>)}
            </tr>
            <tr>
              <td>Other Current Liabilities & Provisions</td>
              {combinedYears.map(y => {
                const ocl = Number(y.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(y.liabilities?.provisions) || 0;
                return <td key={y.year} style={{ textAlign: 'right' }}>{fmt(ocl + prov)}</td>;
              })}
            </tr>
            <tr className="subtotal-row">
              <td>Total Current Liabilities (Excl. CC) (II)</td>
              {combinedYears.map(y => {
                const cred = Number(y.liabilities?.tradeCreditors) || 0;
                const ocl = Number(y.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(y.liabilities?.provisions) || 0;
                return <td key={y.year} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(cred + ocl + prov)}</td>;
              })}
            </tr>

            <tr className="table-row-group"><td colSpan={combinedYears.length + 1}>C. WORKING CAPITAL GAP & FUNDING</td></tr>
            <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
              <td>Working Capital Gap (I - II)</td>
              {combinedYears.map(y => {
                const inv = Number(y.assets?.inventory) || 0;
                const debtors = Number(y.assets?.sundryDebtors) || 0;
                const cash = Number(y.assets?.cashBank) || 0;
                const loans = Number(y.assets?.loansAdvances) || 0;
                const oca = Number(y.assets?.otherCurrentAssets) || 0;
                const ca = inv + debtors + cash + loans + oca;

                const cred = Number(y.liabilities?.tradeCreditors) || 0;
                const ocl = Number(y.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(y.liabilities?.provisions) || 0;
                const cl = cred + ocl + prov;
                return <td key={y.year} style={{ textAlign: 'right', color: '#1e3a8a' }}>{fmt(ca - cl)}</td>;
              })}
            </tr>
            <tr>
              <td>Bank Short Term Borrowings (CC/OD Limit)</td>
              {combinedYears.map(y => <td key={y.year} style={{ textAlign: 'right' }}>{fmt(y.liabilities?.ccOdLimit)}</td>)}
            </tr>
            <tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
              <td>Net Working Capital (Promoter Margin)</td>
              {combinedYears.map(y => {
                const inv = Number(y.assets?.inventory) || 0;
                const debtors = Number(y.assets?.sundryDebtors) || 0;
                const cash = Number(y.assets?.cashBank) || 0;
                const loans = Number(y.assets?.loansAdvances) || 0;
                const oca = Number(y.assets?.otherCurrentAssets) || 0;
                const ca = inv + debtors + cash + loans + oca;

                const cc = Number(y.liabilities?.ccOdLimit) || 0;
                const cred = Number(y.liabilities?.tradeCreditors) || 0;
                const ocl = Number(y.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(y.liabilities?.provisions) || 0;
                const clTotal = cc + cred + ocl + prov;
                return <td key={y.year} style={{ textAlign: 'right', color: '#166534' }}>{fmt(ca - clTotal)}</td>;
              })}
            </tr>
          </tbody>
        </table>
        </div>
      )}

      {/* Page 8: CMA Statement V - Maximum Permissible Bank Finance (MPBF) */}
      {(templateType === 'CMA' || templateType === 'COMBINED') && (
        <div className="print-page">
          <h2 className="report-h1">CMA Statement V: Working Capital Appraisal (MPBF)</h2>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Tandon Committee Method II computation for working capital limit appraisal (in ₹ Lakhs).</div>

        <table className="print-data-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '45%' }}>MPBF Calculations (Method II)</th>
              {projectionsData.projections?.map((p: any) => (
                <th key={p.year} style={{ textAlign: 'right' }}>{p.year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1. Total Current Assets (TCA)</td>
              {projectionsData.projections?.map((p: any) => {
                const bs = p.bsProjection ? JSON.parse(p.bsProjection) : {};
                const inv = Number(bs.assets?.inventory) || 0;
                const debtors = Number(bs.assets?.sundryDebtors) || 0;
                const cash = Number(bs.assets?.cashBank) || 0;
                const loans = Number(bs.assets?.loansAdvances) || 0;
                const oca = Number(bs.assets?.otherCurrentAssets) || 0;
                return <td key={p.year} style={{ textAlign: 'right' }}>{fmt(inv + debtors + cash + loans + oca)}</td>;
              })}
            </tr>
            <tr>
              <td>2. Current Liabilities (Excluding Bank Borrowings)</td>
              {projectionsData.projections?.map((p: any) => {
                const bs = p.bsProjection ? JSON.parse(p.bsProjection) : {};
                const cred = Number(bs.liabilities?.tradeCreditors) || 0;
                const ocl = Number(bs.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(bs.liabilities?.provisions) || 0;
                return <td key={p.year} style={{ textAlign: 'right' }}>{fmt(cred + ocl + prov)}</td>;
              })}
            </tr>
            <tr className="subtotal-row">
              <td>3. Working Capital Gap (WCG) (1 - 2)</td>
              {projectionsData.projections?.map((p: any) => {
                const bs = p.bsProjection ? JSON.parse(p.bsProjection) : {};
                const inv = Number(bs.assets?.inventory) || 0;
                const debtors = Number(bs.assets?.sundryDebtors) || 0;
                const cash = Number(bs.assets?.cashBank) || 0;
                const loans = Number(bs.assets?.loansAdvances) || 0;
                const oca = Number(bs.assets?.otherCurrentAssets) || 0;
                const tca = inv + debtors + cash + loans + oca;

                const cred = Number(bs.liabilities?.tradeCreditors) || 0;
                const ocl = Number(bs.liabilities?.otherCurrentLiab) || 0;
                const prov = Number(bs.liabilities?.provisions) || 0;
                const cl = cred + ocl + prov;
                return <td key={p.year} style={{ textAlign: 'right' }}>{fmt(tca - cl)}</td>;
              })}
            </tr>
            <tr>
              <td>4. Minimum Margin (25% of Total Current Assets)</td>
              {projectionsData.projections?.map((p: any) => {
                const bs = p.bsProjection ? JSON.parse(p.bsProjection) : {};
                const inv = Number(bs.assets?.inventory) || 0;
                const debtors = Number(bs.assets?.sundryDebtors) || 0;
                const cash = Number(bs.assets?.cashBank) || 0;
                const loans = Number(bs.assets?.loansAdvances) || 0;
                const oca = Number(bs.assets?.otherCurrentAssets) || 0;
                const tca = inv + debtors + cash + loans + oca;
                return <td key={p.year} style={{ textAlign: 'right' }}>{fmt(tca * 0.25)}</td>;
              })}
            </tr>
            <tr className="subtotal-row">
              <td>5. Maximum Permissible Bank Finance (MPBF) (3 - 4)</td>
              {projectionsData.projections?.map((p: any) => {
                const r = p.ratios ? JSON.parse(p.ratios) : {};
                return <td key={p.year} style={{ textAlign: 'right', fontWeight: 800, color: '#166534' }}>{fmt(r.mpbf)}</td>;
              })}
            </tr>
            <tr>
              <td>6. Proposed Bank Working Capital Limit (CC Limit)</td>
              {projectionsData.projections?.map((p: any) => {
                const bs = p.bsProjection ? JSON.parse(p.bsProjection) : {};
                return <td key={p.year} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(bs.liabilities?.ccOdLimit)}</td>;
              })}
            </tr>
          </tbody>
        </table>
        </div>
      )}

      {/* Page 9: CMA Statement VI - Fund Flow Statement */}
      {(templateType === 'CMA' || templateType === 'COMBINED') && (
        <div className="print-page">
          <h2 className="report-h1">CMA Statement VI: Fund Flow Statement</h2>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Tracking yearly sources and applications of capital (in ₹ Lakhs).</div>

        {fundFlowList.map((flow: any) => (
          <div key={flow.year} style={{ marginBottom: 24 }}>
            <h3 className="section-sub" style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: 4, display: 'inline-block' }}>
              Financial Year: {flow.year}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 10 }}>
              {/* Sources Table */}
              <div>
                <table className="print-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Sources of Funds</th>
                      <th style={{ textAlign: 'right', width: '35%' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flow.sources.filter((s: any) => s.value > 0).map((s: any, idx: number) => (
                      <tr key={idx}>
                        <td>{s.label}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(s.value)}</td>
                      </tr>
                    ))}
                    {flow.sources.filter((s: any) => s.value > 0).length === 0 && (
                      <tr><td colSpan={2} style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No Sources</td></tr>
                    )}
                    <tr className="subtotal-row" style={{ background: '#f0fdf4' }}>
                      <td>Total Sources</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(flow.totalSources)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Applications Table */}
              <div>
                <table className="print-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Applications of Funds</th>
                      <th style={{ textAlign: 'right', width: '35%' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flow.applications.filter((a: any) => a.value > 0).map((a: any, idx: number) => (
                      <tr key={idx}>
                        <td>{a.label}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(a.value)}</td>
                      </tr>
                    ))}
                    {flow.applications.filter((a: any) => a.value > 0).length === 0 && (
                      <tr><td colSpan={2} style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No Applications</td></tr>
                    )}
                    <tr className="subtotal-row" style={{ background: '#fef2f2' }}>
                      <td>Total Applications</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#991b1b' }}>{fmt(flow.totalApps)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Reconciliation Check */}
            {Math.abs(flow.totalSources - flow.totalApps) > 0.05 && (
              <div style={{ fontSize: 9, color: '#64748b', textAlign: 'right', marginTop: 4 }}>
                Unreconciled Cash Balances: ₹{fmt(Math.abs(flow.totalSources - flow.totalApps))} L (reflected in cash changes)
              </div>
            )}
          </div>
        ))}
        </div>
      )}

      {/* Page 9.1 (DPR): Projected Cash Flow Statement */}
      {(templateType === 'DPR' || templateType === 'COMBINED') && (
        <div className="print-page">
          <h2 className="report-h1">Projected Cash Flow Statement (Indirect Method)</h2>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
            Yearly statement of cash flows tracking operating, investing, and financing activities (in ₹ Lakhs).
          </div>

          <table className="print-data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '40%' }}>Particulars</th>
                {cashFlowStatementList.map(cf => (
                  <th key={cf.year} style={{ textAlign: 'right' }}>{cf.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="table-row-group"><td colSpan={cashFlowStatementList.length + 1}>A. CASH FLOW FROM OPERATING ACTIVITIES</td></tr>
              <tr>
                <td>Operating Profit Before WC Changes (PAT + Depreciation)</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right' }}>{fmt(cf.operatingCashBeforeWC)}</td>
                ))}
              </tr>
              <tr>
                <td>Working Capital Adjustments</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right', color: cf.wcChanges >= 0 ? '#166534' : '#b91c1c' }}>
                    {fmt(cf.wcChanges)}
                  </td>
                ))}
              </tr>
              <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                <td>Net Cash from Operating Activities (A)</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right' }}>{fmt(cf.cfo)}</td>
                ))}
              </tr>

              <tr className="table-row-group"><td colSpan={cashFlowStatementList.length + 1}>B. CASH FLOW FROM INVESTING ACTIVITIES</td></tr>
              <tr>
                <td>Capital Expenditure (CAPEX & Asset Additions)</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right', color: '#b91c1c' }}>
                    {fmt(cf.cfi)}
                  </td>
                ))}
              </tr>
              <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                <td>Net Cash from Investing Activities (B)</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right' }}>{fmt(cf.cfi)}</td>
                ))}
              </tr>

              <tr className="table-row-group"><td colSpan={cashFlowStatementList.length + 1}>C. CASH FLOW FROM FINANCING ACTIVITIES</td></tr>
              <tr>
                <td>Net Share Capital / Loans / Credit Infusion</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right', color: cf.cff >= 0 ? '#166534' : '#b91c1c' }}>
                    {fmt(cf.cff)}
                  </td>
                ))}
              </tr>
              <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                <td>Net Cash from Financing Activities (C)</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right' }}>{fmt(cf.cff)}</td>
                ))}
              </tr>

              <tr className="subtotal-row" style={{ background: '#f1f5f9' }}>
                <td>Net Cash Flow Increment (A + B + C)</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right', fontWeight: 800 }}>{fmt(cf.netCashFlow)}</td>
                ))}
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <td>Opening Cash & Bank Balance</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right' }}>{fmt(cf.openingCash)}</td>
                ))}
              </tr>
              <tr style={{ fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>
                <td>Closing Cash & Bank Balance</td>
                {cashFlowStatementList.map(cf => (
                  <td key={cf.year} style={{ textAlign: 'right', fontWeight: 800 }}>{fmt(cf.closingCash)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Page 9.2 (DPR): Break-Even Point (BEP) Analysis */}
      {(templateType === 'DPR' || templateType === 'COMBINED') && bepAnalysisList.length > 0 && (
        <div className="print-page">
          <h2 className="report-h1">Break-Even Point (BEP) Analysis</h2>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
            Assessment of operational risk, margin of safety, and cost structure viability (in ₹ Lakhs).
          </div>

          <table className="print-data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '40%' }}>BEP Metric Details</th>
                {bepAnalysisList.map(bep => (
                  <th key={bep.year} style={{ textAlign: 'right' }}>{bep.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Projected Revenue (Sales)</td>
                {bepAnalysisList.map(bep => (
                  <td key={bep.year} style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(bep.sales)}</td>
                ))}
              </tr>
              <tr>
                <td>Variable Costs (Raw Materials, Power & Fuel, Mfg Exp)</td>
                {bepAnalysisList.map(bep => (
                  <td key={bep.year} style={{ textAlign: 'right' }}>{fmt(bep.variableCosts)}</td>
                ))}
              </tr>
              <tr style={{ fontWeight: 600, background: '#f8fafc' }}>
                <td>Contribution Margin (Sales - Variable Costs)</td>
                {bepAnalysisList.map(bep => (
                  <td key={bep.year} style={{ textAlign: 'right', color: '#166534' }}>{fmt(bep.contribution)}</td>
                ))}
              </tr>
              <tr>
                <td>Fixed Costs (Salary, Admin, Selling, Rent, Interest, Depreciation)</td>
                {bepAnalysisList.map(bep => (
                  <td key={bep.year} style={{ textAlign: 'right' }}>{fmt(bep.fixedCosts)}</td>
                ))}
              </tr>
              <tr className="subtotal-row" style={{ background: '#f0fdf4' }}>
                <td>Break-Even Sales (Required Revenue to Break-Even)</td>
                {bepAnalysisList.map(bep => (
                  <td key={bep.year} style={{ textAlign: 'right', fontWeight: 800, color: '#166534' }}>
                    {fmt(bep.breakEvenSales)}
                  </td>
                ))}
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td>Break-Even Capacity Utilization (%)</td>
                {bepAnalysisList.map(bep => (
                  <td key={bep.year} style={{ textAlign: 'right', color: bep.breakEvenPercent > 70 ? '#b91c1c' : '#166534' }}>
                    {fmt(bep.breakEvenPercent, 2)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 24, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 6px 0', color: '#1e293b' }}>Analytical Interpretation:</h4>
            <p style={{ fontSize: 11, margin: 0, color: '#475569', lineHeight: 1.5 }}>
              A break-even utilization below 60% indicates a strong margin of safety. This represents a resilient cost structure, where the business can absorb a decline in sales before encountering operating losses.
            </p>
          </div>
        </div>
      )}

      {/* Page 9.3 (DPR): Capital Budgeting IRR & NPV Appraisal */}
      {(templateType === 'DPR' || templateType === 'COMBINED') && capitalBudgetingData.cashFlows.length > 0 && (
        <div className="print-page">
          <h2 className="report-h1">Capital Budgeting: NPV & IRR Appraisal</h2>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
            Discounted cash flow (DCF) appraisal of project viability, Internal Rate of Return (IRR), and Net Present Value (NPV) (in ₹ Lakhs).
          </div>

          <table className="print-data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '35%' }}>Underwriting Metric</th>
                <th style={{ textAlign: 'center', width: '15%' }}>Year 0 (CAPEX)</th>
                {capitalBudgetingData.projYears.map((y: any, idx: number) => (
                  <th key={y.year} style={{ textAlign: 'right' }}>Year {idx + 1} ({y.year})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Net Cash Flows (Project Outflow / Inflows)</td>
                <td style={{ textAlign: 'center', fontWeight: 600, color: '#b91c1c' }}>
                  ({fmt(Math.abs(capitalBudgetingData.cashFlows[0] || 0))})
                </td>
                {capitalBudgetingData.cashFlows.slice(1).map((flow: number, idx: number) => (
                  <td key={idx} style={{ textAlign: 'right' }}>{fmt(flow)}</td>
                ))}
              </tr>
              <tr>
                <td>Present Value (PV) Factor @ {capitalBudgetingData.discountRate}%</td>
                <td style={{ textAlign: 'center' }}>1.0000</td>
                {capitalBudgetingData.cashFlows.slice(1).map((_: number, idx: number) => {
                  const factor = 1 / Math.pow(1 + capitalBudgetingData.discountRate / 100, idx + 1);
                  return <td key={idx} style={{ textAlign: 'right' }}>{factor.toFixed(4)}</td>
                })}
              </tr>
              <tr style={{ fontWeight: 600, background: '#f8fafc' }}>
                <td>Discounted Cash Flows (PV of Flows)</td>
                <td style={{ textAlign: 'center', color: '#b91c1c' }}>
                  ({fmt(Math.abs(capitalBudgetingData.cashFlows[0] || 0))})
                </td>
                {capitalBudgetingData.cashFlows.slice(1).map((flow: number, idx: number) => {
                  const factor = 1 / Math.pow(1 + capitalBudgetingData.discountRate / 100, idx + 1);
                  return <td key={idx} style={{ textAlign: 'right' }}>{fmt(flow * factor)}</td>
                })}
              </tr>
              <tr className="subtotal-row" style={{ background: '#f0fdf4' }}>
                <td>Net Present Value (NPV) @ {capitalBudgetingData.discountRate}%</td>
                <td colSpan={capitalBudgetingData.cashFlows.length} style={{ textAlign: 'right', fontWeight: 800, color: '#166534' }}>
                  ₹{fmt(capitalBudgetingData.npvVal)} Lakhs
                </td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td>Internal Rate of Return (Project IRR)</td>
                <td colSpan={capitalBudgetingData.cashFlows.length} style={{ textAlign: 'right', color: capitalBudgetingData.irrVal > 15 ? '#166534' : '#b91c1c' }}>
                  {capitalBudgetingData.irrVal.toFixed(2)}% p.a.
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 24, padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 6px 0', color: '#166534' }}>Viability Summary:</h4>
            <p style={{ fontSize: 11, margin: 0, color: '#14532d', lineHeight: 1.5 }}>
              The project yields a positive Net Present Value of <strong>₹{fmt(capitalBudgetingData.npvVal)} Lakhs</strong> and a Project IRR of <strong>{capitalBudgetingData.irrVal.toFixed(2)}%</strong>, which significantly exceeds the weighted average cost of capital (WACC). This confirms the financial viability of the projected investment.
            </p>
          </div>
        </div>
      )}

      {/* Page 10: Ratio Analysis & Visual Graphs */}
      <div className="print-page">
        <h2 className="report-h1">VII. Ratio Analysis & Banking Benchmarks</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
          <div>
            <table className="print-data-table ratio-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Banking Ratios</th>
                  {projectionsData.projections?.map((p: any) => (
                    <th key={p.year} style={{ textAlign: 'right' }}>{p.year}</th>
                  ))}
                  <th style={{ textAlign: 'right' }}>Benchmark</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Debt Service Coverage Ratio (DSCR)</td>
                  {projectionsData.projections?.map((p: any) => {
                    const r = p.ratios ? JSON.parse(p.ratios) : {};
                    const isGood = (r.dscr || 0) >= 1.25;
                    return <td key={p.year} style={{ textAlign: 'right', fontWeight: 700, color: isGood ? '#166534' : '#991b1b' }}>{fmt(r.dscr)}</td>;
                  })}
                  <td style={{ textAlign: 'right', color: '#64748b' }}>≥ 1.25</td>
                </tr>
                <tr>
                  <td>Current Ratio</td>
                  {projectionsData.projections?.map((p: any) => {
                    const r = p.ratios ? JSON.parse(p.ratios) : {};
                    const isGood = (r.currentRatio || 0) >= 1.33;
                    return <td key={p.year} style={{ textAlign: 'right', fontWeight: 700, color: isGood ? '#166534' : '#991b1b' }}>{fmt(r.currentRatio)}</td>;
                  })}
                  <td style={{ textAlign: 'right', color: '#64748b' }}>≥ 1.33</td>
                </tr>
                <tr>
                  <td>Debt-Equity Ratio</td>
                  {projectionsData.projections?.map((p: any) => {
                    const r = p.ratios ? JSON.parse(p.ratios) : {};
                    const isGood = (r.debtEquityRatio || 0) <= 2.0;
                    return <td key={p.year} style={{ textAlign: 'right', fontWeight: 700, color: isGood ? '#166534' : '#991b1b' }}>{fmt(r.debtEquityRatio)}</td>;
                  })}
                  <td style={{ textAlign: 'right', color: '#64748b' }}>≤ 2.00</td>
                </tr>
                <tr>
                  <td>EBITDA Margin %</td>
                  {projectionsData.projections?.map((p: any) => {
                    const r = p.ratios ? JSON.parse(p.ratios) : {};
                    return <td key={p.year} style={{ textAlign: 'right' }}>{fmt(r.ebitdaMarginPct)}%</td>;
                  })}
                  <td style={{ textAlign: 'right', color: '#64748b' }}>≥ 15.0%</td>
                </tr>
                <tr>
                  <td>Net Profit Margin %</td>
                  {projectionsData.projections?.map((p: any) => {
                    const r = p.ratios ? JSON.parse(p.ratios) : {};
                    return <td key={p.year} style={{ textAlign: 'right' }}>{fmt(r.netMarginPct)}%</td>;
                  })}
                  <td style={{ textAlign: 'right', color: '#64748b' }}>≥ 5.0%</td>
                </tr>
                <tr>
                  <td>Interest Coverage Ratio</td>
                  {projectionsData.projections?.map((p: any) => {
                    const r = p.ratios ? JSON.parse(p.ratios) : {};
                    return <td key={p.year} style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.interestCoverageRatio)}</td>;
                  })}
                  <td style={{ textAlign: 'right', color: '#64748b' }}>≥ 2.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="swot-box" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <strong>Banking Summary</strong>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: 8, lineHeight: 1.6 }}>
                The financial structures conform to standard RBI guidelines. The projected average DSCR satisfies credit risk thresholds.
              </div>
            </div>
            {aiCommentaries.ratio_commentary && (
              <div className="swot-box" style={{ background: '#f3e8ff', border: '1px solid #d8b4fe' }}>
                <strong>AI Ratio Commentary</strong>
                <p style={{ fontSize: '10px', color: '#581c87', marginTop: 6, lineHeight: 1.5, maxHeight: 110, overflow: 'hidden' }}>
                  {aiCommentaries.ratio_commentary}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic SVG Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 32 }}>
          {/* Chart 1: Revenue vs Net Profit (PAT) */}
          <div className="chart-container-print">
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 12, textAlign: 'center' }}>
              Revenue & Net Profit (PAT) Trend (₹ L)
            </h4>
            <RevenueChart data={projectionsData.projections} />
          </div>

          {/* Chart 2: DSCR Trend */}
          <div className="chart-container-print">
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 12, textAlign: 'center' }}>
              Debt Service Coverage Ratio (DSCR) Trend
            </h4>
            <DscrChart data={projectionsData.projections} />
          </div>
        </div>
      </div>

      {/* Page 11: Amortization Schedule & Sign-Offs */}
      <div className="print-page">
        <h2 className="report-h1">VIII. Amortization & Sign-Off</h2>

        {projectionsData.loanSchedule ? (
          <div>
            <h3 className="section-sub" style={{ margin: '16px 0 8px 0' }}>Annual Loan Repayment Schedule</h3>
            <table className="print-data-table repayment-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Repayment Year</th>
                  <th style={{ textAlign: 'right' }}>Opening Balance</th>
                  <th style={{ textAlign: 'right' }}>Principal Repaid</th>
                  <th style={{ textAlign: 'right' }}>Interest Paid</th>
                  <th style={{ textAlign: 'right' }}>Total Installment</th>
                  <th style={{ textAlign: 'right' }}>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const schedule = typeof projectionsData.loanSchedule.scheduleData === 'string'
                    ? JSON.parse(projectionsData.loanSchedule.scheduleData)
                    : projectionsData.loanSchedule.scheduleData || [];
                    
                  return schedule
                    .filter((r: any) => !r.isMoratorium || r.month % 12 === 0)
                    .reduce((acc: any[], row: any) => {
                      const yr = Math.ceil(row.month / 12);
                      if (!acc[yr]) {
                        acc[yr] = { year: yr, opening: row.openingBalance, principal: 0, interest: 0, total: 0, closing: row.closingBalance };
                      }
                      acc[yr].principal += row.principal;
                      acc[yr].interest += row.interest;
                      acc[yr].total += row.emi;
                      acc[yr].closing = row.closingBalance;
                      return acc;
                    }, [])
                    .filter(Boolean)
                    .map((yr: any) => (
                      <tr key={yr.year}>
                        <td style={{ textAlign: 'left', fontWeight: 600 }}>Year {yr.year}</td>
                        <td style={{ textAlign: 'right' }}>₹{fmt(yr.opening)}</td>
                        <td style={{ textAlign: 'right' }}>₹{fmt(yr.principal)}</td>
                        <td style={{ textAlign: 'right' }}>₹{fmt(yr.interest)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{fmt(yr.total)}</td>
                        <td style={{ textAlign: 'right' }}>₹{fmt(yr.closing)}</td>
                      </tr>
                    ));
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="swot-box" style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
            No loan schedule calculated. Enter loan requirements in the Cover page or Loan tabs.
          </div>
        )}

        {aiCommentaries.creditworthiness && (
          <div style={{ marginTop: 24 }}>
            <h3 className="section-sub">8.2 AI Creditworthiness Appraisal</h3>
            <p className="narrative-p" style={{ borderLeft: '3px solid #7c3aed', background: '#fbfaff', padding: '12px' }}>
              {aiCommentaries.creditworthiness}
            </p>
          </div>
        )}

        {/* Signature Box */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="sig-line"></div>
            <span>Appraised By (Credit Manager)</span>
          </div>
          <div className="signature-box">
            <div className="sig-line"></div>
            <span>Authorized Signatory / Partner</span>
          </div>
        </div>
      </div>
      
      {/* Printable CSS style definitions directly embedded */}
      <style>{`
        body {
          background-color: #f1f5f9;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }

        .print-report-wrapper {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }

        .no-print.print-actions-bar {
          background: #ffffff;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .print-page {
          background: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02);
          border-radius: 4px;
          padding: 2.2cm 1.8cm;
          margin-bottom: 30px;
          min-height: 297mm;
          box-sizing: border-box;
          position: relative;
        }

        /* Cover Page styling */
        .cover-page {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3cm 2cm;
        }
        .cover-border {
          border: 4px solid #1e3a8a;
          height: 100%;
          min-height: 220mm;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-radius: 6px;
        }
        .cover-header {
          text-align: center;
          margin-top: 20px;
        }
        .cover-org {
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 700;
          color: #4b5563;
        }
        .cover-title {
          font-size: 28px;
          font-weight: 800;
          color: #1e3a8a;
          margin-top: 30px;
          line-height: 1.25;
        }
        .cover-subtitle {
          font-size: 13px;
          color: #4b5563;
          margin-top: 12px;
          font-weight: 500;
        }
        .cover-meta-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin: 60px 0;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          padding: 32px 0;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          font-weight: 600;
        }
        .meta-value {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-top: 4px;
        }
        .meta-subvalue {
          font-size: 12px;
          color: #4b5563;
          margin-top: 2px;
        }
        .cover-footer {
          text-align: center;
          margin-bottom: 20px;
        }

        /* Typography & Layout elements */
        .report-h1 {
          font-size: 18px;
          font-weight: 800;
          color: #1e3a8a;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 8px;
          margin-top: 0;
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .section-sub {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .details-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 16px 20px;
        }
        .profile-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .profile-table td {
          padding: 6px 12px 6px 0;
          color: #334155;
        }
        .narrative-p {
          font-size: 12px;
          line-height: 1.6;
          color: #334155;
          text-align: justify;
        }
        .narrative-p-placeholder {
          font-size: 12px;
          font-style: italic;
          color: #94a3b8;
          padding: 16px;
          border: 1px dashed #cbd5e1;
          border-radius: 4px;
          text-align: center;
        }

        .swot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .swot-box {
          border: 1px solid #cbd5e1;
          background: #fafafa;
          border-radius: 6px;
          padding: 14px 16px;
          font-size: 12px;
        }

        /* Print Tables styles */
        .print-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 20px;
        }
        .print-data-table th, .print-data-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
        }
        .print-data-table th {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
        }
        .table-row-group {
          background-color: #f8fafc;
          font-weight: 700;
        }
        .table-row-group td {
          color: #1e3a8a;
          padding: 4px 8px;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .subtotal-row {
          font-weight: 700;
          background-color: #f1f5f9;
        }
        .netprofit-row {
          font-weight: 800;
          background-color: #ecfdf5;
          border-top: 2px solid #059669;
          border-bottom: 2px solid #059669;
        }

        .signature-section {
          margin-top: 80px;
          display: flex;
          justify-content: space-between;
          padding: 0 40px;
        }
        .signature-box {
          text-align: center;
          width: 220px;
          font-size: 11px;
          color: #475569;
        }
        .sig-line {
          border-bottom: 1px solid #475569;
          margin-bottom: 8px;
          height: 40px;
        }

        .chart-container-print {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 16px;
          background: #ffffff;
        }

        /* Print Mode styles */
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 12pt;
          }
          .print-report-wrapper {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 1.8cm 1.5cm !important;
            margin-bottom: 0 !important;
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 297mm !important;
          }
          .print-page:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// LIGHTWEIGHT DYNAMIC SVG CHART FOR REVENUE & PAT TRENDS
// ============================================================
function RevenueChart({ data = [] }: { data: any[] }) {
  if (data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>No Data Available</div>;

  const width = 360;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Extract years and values
  const years = data.map(d => d.year);
  const values = data.map(d => {
    const pl = d.plProjection ? JSON.parse(d.plProjection) : (d.pl || {});
    const ratios = d.ratios ? JSON.parse(d.ratios) : (d.ratios || {});
    return {
      revenue: Number(pl.grossSales) || 0,
      pat: Number(ratios.pat) || 0
    };
  });

  const maxVal = Math.max(...values.map(v => Math.max(v.revenue, v.pat, 10)), 100) * 1.15;

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Background Grid */}
      {gridLines.map((ratio, i) => {
        const y = paddingTop + chartHeight * (1 - ratio);
        const val = Math.round(maxVal * ratio);
        return (
          <g key={i}>
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="monospace">
              {val}
            </text>
          </g>
        );
      })}

      {/* Axis Lines */}
      <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />

      {/* Bar Rendering (Revenue) */}
      {values.map((v, i) => {
        const barWidth = Math.min(22, chartWidth / years.length * 0.4);
        const spacing = chartWidth / years.length;
        const x = paddingLeft + (i * spacing) + (spacing / 2) - (barWidth / 2);
        
        const revHeight = (v.revenue / maxVal) * chartHeight;
        const y = height - paddingBottom - revHeight;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={revHeight}
              fill="#c084fc"
              rx="2"
            />
            {/* X-axis labels */}
            <text x={x + barWidth / 2} y={height - paddingBottom + 14} textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600">
              {years[i]}
            </text>
          </g>
        );
      })}

      {/* Line Rendering (PAT) */}
      {(() => {
        const spacing = chartWidth / years.length;
        const points = values.map((v, i) => {
          const x = paddingLeft + (i * spacing) + (spacing / 2);
          const patHeight = (v.pat / maxVal) * chartHeight;
          const y = height - paddingBottom - patHeight;
          return `${x},${y}`;
        }).join(' ');

        return (
          <polyline
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.5"
            points={points}
          />
        );
      })()}

      {/* Line Dots */}
      {values.map((v, i) => {
        const spacing = chartWidth / years.length;
        const x = paddingLeft + (i * spacing) + (spacing / 2);
        const patHeight = (v.pat / maxVal) * chartHeight;
        const y = height - paddingBottom - patHeight;

        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill="#7c3aed"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Legend */}
      <g transform={`translate(${paddingLeft + 30}, ${height - 5})`}>
        <rect width="10" height="10" fill="#c084fc" rx="2" />
        <text x="14" y="9" fontSize="8" fill="#475569" fontWeight="600">Gross Sales</text>

        <line x1="90" y1="5" x2="105" y2="5" stroke="#7c3aed" strokeWidth="2.5" />
        <circle cx="97.5" cy="5" r="2.5" fill="#7c3aed" />
        <text x="110" y="9" fontSize="8" fill="#475569" fontWeight="600">PAT</text>
      </g>
    </svg>
  );
}

// ============================================================
// LIGHTWEIGHT DYNAMIC SVG CHART FOR DSCR TRENDS
// ============================================================
function DscrChart({ data = [] }: { data: any[] }) {
  if (data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>No Data Available</div>;

  const width = 360;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const years = data.map(d => d.year);
  const values = data.map(d => {
    const ratios = d.ratios ? JSON.parse(d.ratios) : (d.ratios || {});
    return Number(ratios.dscr) || 0;
  });

  const maxVal = Math.max(...values, 2.5) * 1.15;

  // Grid lines (0 to maxVal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Background Grid */}
      {gridLines.map((ratio, i) => {
        const y = paddingTop + chartHeight * (1 - ratio);
        const val = (maxVal * ratio).toFixed(1);
        return (
          <g key={i}>
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="monospace">
              {val}
            </text>
          </g>
        );
      })}

      {/* Axis Lines */}
      <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />

      {/* Threshold line at 1.25 (RBI Standard) */}
      {(() => {
        const yThresh = paddingTop + chartHeight * (1 - (1.25 / maxVal));
        return (
          <g>
            <line x1={paddingLeft} y1={yThresh} x2={width - paddingRight} y2={yThresh} stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,4" />
            <text x={width - paddingRight - 10} y={yThresh - 4} fontSize="8" fill="#dc2626" fontWeight="700" textAnchor="end">
              Benchmark (1.25)
            </text>
          </g>
        );
      })()}

      {/* DSCR Line Rendering */}
      {(() => {
        const spacing = chartWidth / years.length;
        const points = values.map((val, i) => {
          const x = paddingLeft + (i * spacing) + (spacing / 2);
          const valHeight = (val / maxVal) * chartHeight;
          const y = height - paddingBottom - valHeight;
          return `${x},${y}`;
        }).join(' ');

        return (
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            points={points}
          />
        );
      })()}

      {/* Line Dots */}
      {values.map((val, i) => {
        const spacing = chartWidth / years.length;
        const x = paddingLeft + (i * spacing) + (spacing / 2);
        const valHeight = (val / maxVal) * chartHeight;
        const y = height - paddingBottom - valHeight;

        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="4.5"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Label values */}
            <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">
              {val.toFixed(2)}
            </text>
            {/* X-axis label */}
            <text x={x} y={height - paddingBottom + 14} textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600">
              {years[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
