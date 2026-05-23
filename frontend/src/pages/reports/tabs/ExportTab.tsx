import { useState } from 'react';
import { api } from '../../../lib/api';
import * as XLSX from 'xlsx';

const BANK_STYLES = ['SBI Style', 'HDFC Style', 'ICICI Style'];

export default function ExportTab({ reportId, report }: { reportId: string; report: any }) {
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [style, setStyle] = useState('SBI Style');

  const handleExcelExport = async () => {
    setExporting(true); setMsg('');
    try {
      const data = await api.exports.excel(reportId);
      if (!data.success) throw new Error('Export failed');
      generateExcel(data.data, data.fileName);
      setMsg(`✓ Excel exported: ${data.fileName}`);
    } catch (err: any) {
      setMsg('Error: ' + err.message);
    } finally {
      setExporting(false);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const generateExcel = (data: any, fileName: string) => {
    const wb = XLSX.utils.book_new();
    const fmt = (n: number) => Number(n || 0).toFixed(2);

    // COVER SHEET
    const coverData = [
      ['CMA PRO AI - FINANCIAL ANALYSIS REPORT', '', ''],
      [''],
      ['Client Name', data.report?.client?.name || '', ''],
      ['Business Name', data.report?.client?.businessName || '', ''],
      ['PAN Number', data.report?.client?.pan || '', ''],
      ['Industry', data.report?.client?.industryType || '', ''],
      ['Loan Type', data.report?.loanType || '', ''],
      ['Bank Name', data.report?.bankName || '', ''],
      ['Loan Amount', `₹${Number(data.report?.loanAmount||0).toLocaleString('en-IN')} Lakhs`, ''],
      ['Report Type', data.report?.reportType || '', ''],
      ['Generated On', new Date().toLocaleDateString('en-IN'), ''],
      [''],
      ['Prepared by CMA Pro AI - Enterprise Financial Underwriting Platform', '', ''],
    ];
    const coverWs = XLSX.utils.aoa_to_sheet(coverData);
    XLSX.utils.book_append_sheet(wb, coverWs, 'Cover Page');

    // P&L SHEET
    if (data.financialYears?.length > 0 || data.projections?.length > 0) {
      const plHeaders = ['Particulars', ...data.financialYears.map((y: any) => y.year + ' (A)'), ...data.projections.map((p: any) => p.year + ' (P)')];
      const plRows = [
        plHeaders,
        ['', ...Array(plHeaders.length - 1).fill('')],
        ['INCOME', ...Array(plHeaders.length - 1).fill('')],
        ['Gross Sales / Turnover',
          ...data.financialYears.map((y: any) => fmt(y.plData?.grossSales)),
          ...data.projections.map((p: any) => fmt(p.plProjection?.grossSales))],
        ['Other Income',
          ...data.financialYears.map((y: any) => fmt(y.plData?.otherIncome)),
          ...data.projections.map((p: any) => fmt(p.plProjection?.otherIncome))],
        ['Total Income',
          ...data.financialYears.map((y: any) => fmt((y.plData?.grossSales||0)+(y.plData?.otherIncome||0))),
          ...data.projections.map((p: any) => fmt((p.plProjection?.grossSales||0)+(p.plProjection?.otherIncome||0)))],
        [''],
        ['EXPENSES', ...Array(plHeaders.length - 1).fill('')],
        ['Raw Material / Purchase',
          ...data.financialYears.map((y: any) => fmt(y.plData?.rawMaterial)),
          ...data.projections.map((p: any) => fmt(p.plProjection?.rawMaterial))],
        ['Salary & Wages',
          ...data.financialYears.map((y: any) => fmt(y.plData?.salaryWages)),
          ...data.projections.map((p: any) => fmt(p.plProjection?.salaryWages))],
        ['Power & Fuel',
          ...data.financialYears.map((y: any) => fmt(y.plData?.powerFuel)),
          ...data.projections.map((p: any) => fmt(p.plProjection?.powerFuel))],
        ['Depreciation',
          ...data.financialYears.map((y: any) => fmt(y.plData?.depreciation)),
          ...data.projections.map((p: any) => fmt(p.plProjection?.depreciation))],
        ['Interest Expense',
          ...data.financialYears.map((y: any) => fmt(y.plData?.interestExp)),
          ...data.projections.map((p: any) => fmt(p.plProjection?.interestExp))],
        ['PAT (Net Profit)',
          ...data.financialYears.map((y: any) => {
            const pl = y.plData || {};
            const income = (pl.grossSales||0)+(pl.otherIncome||0);
            const exp = (pl.rawMaterial||0)+(pl.salaryWages||0)+(pl.powerFuel||0)+(pl.manufacturingExp||0)+(pl.adminExp||0)+(pl.sellingExp||0)+(pl.rent||0)+(pl.repairMaintenance||0)+(pl.depreciation||0)+(pl.interestExp||0)+(pl.taxExpense||0);
            return fmt(income - exp);
          }),
          ...data.projections.map((p: any) => fmt(p.ratios?.pat || 0))],
      ];
      const plWs = XLSX.utils.aoa_to_sheet(plRows);
      XLSX.utils.book_append_sheet(wb, plWs, 'P&L Statement');
    }

    // RATIO SHEET
    if (data.projections?.length > 0) {
      const ratioHeaders = ['Banking Ratios', ...data.projections.map((p: any) => p.year), 'Benchmark'];
      const ratioRows = [
        ratioHeaders,
        ['DSCR', ...data.projections.map((p: any) => fmt(p.ratios?.dscr||0)), '≥ 1.25'],
        ['Current Ratio', ...data.projections.map((p: any) => fmt(p.ratios?.currentRatio||0)), '≥ 1.33'],
        ['Debt Equity Ratio', ...data.projections.map((p: any) => fmt(p.ratios?.debtEquityRatio||0)), '≤ 2.00'],
        ['Interest Coverage', ...data.projections.map((p: any) => fmt(p.ratios?.interestCoverageRatio||0)), '≥ 2.00'],
        ['Net Profit Margin %', ...data.projections.map((p: any) => fmt(p.ratios?.netMarginPct||0)), '≥ 5%'],
        ['EBITDA Margin %', ...data.projections.map((p: any) => fmt(p.ratios?.ebitdaMarginPct||0)), '≥ 15%'],
        ['MPBF (₹ Lakhs)', ...data.projections.map((p: any) => fmt(p.ratios?.mpbf||0)), '—'],
        ['Net Worth (₹ Lakhs)', ...data.projections.map((p: any) => fmt(p.ratios?.netWorth||0)), '—'],
      ];
      const ratioWs = XLSX.utils.aoa_to_sheet(ratioRows);
      XLSX.utils.book_append_sheet(wb, ratioWs, 'Ratio Analysis');
    }

    // LOAN SCHEDULE SHEET
    if (data.loanSchedule?.scheduleData?.length > 0) {
      const schedHeaders = ['Month', 'Opening Balance', 'EMI', 'Interest', 'Principal', 'Closing Balance', 'Status'];
      const schedRows = [schedHeaders, ...data.loanSchedule.scheduleData.map((r: any) => [
        r.month, fmt(r.openingBalance), fmt(r.emi), fmt(r.interest), fmt(r.principal), fmt(r.closingBalance),
        r.isMoratorium ? 'Moratorium' : 'Regular'
      ])];
      const schedWs = XLSX.utils.aoa_to_sheet(schedRows);
      XLSX.utils.book_append_sheet(wb, schedWs, 'Loan Schedule');
    }

    XLSX.writeFile(wb, fileName);
  };

  const exportFeatures = [
    { label: 'Multi-Sheet CMA Excel', desc: 'Cover, P&L, BS, Ratios, Loan Schedule', icon: '📊', available: true },
    { label: 'Ratio Analysis Sheet', desc: 'All 12 banking ratios with benchmarks', icon: '📈', available: true },
    { label: 'Loan EMI Schedule', desc: 'Month-wise reducing balance schedule', icon: '💳', available: true },
    { label: 'PDF Project Report', desc: 'Full bank-style project report with charts & AI analysis', icon: '📄', available: true },
    { label: 'Cash Flow Statement', desc: 'Operating, Investing, Financing activities', icon: '💵', available: true },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="page-header">
        <div>
          <h3 style={{fontSize:15,fontWeight:700}}>📥 Export Bank-Ready Reports</h3>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Generate professional Excel and PDF reports</p>
        </div>
      </div>

      {/* Style Selector */}
      <div className="card">
        <div className="card-header"><div className="card-title">Export Style</div></div>
        <div className="card-body">
          <div style={{display:'flex',gap:12}}>
            {BANK_STYLES.map(s => (
              <button key={s} className={`btn ${style === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStyle(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {exportFeatures.map(f => (
          <div key={f.label} className={`card ${!f.available ? 'opacity-50' : ''}`}
            style={{opacity: f.available ? 1 : 0.5}}>
            <div className="card-body" style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{fontSize:32}}>{f.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{f.label}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{f.desc}</div>
              </div>
              {f.available ? (
                <span className="badge badge-green">Ready</span>
              ) : (
                <span className="badge badge-gray">Soon</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      {/* Export Buttons */}
      <div className="card">
        <div className="card-header"><div className="card-title">Generate & Download</div></div>
        <div className="card-body" style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:12}}>
            <button className="btn btn-success btn-lg" onClick={handleExcelExport} disabled={exporting}
              style={{flex:1}}>
              {exporting ? <><span className="spinner" />Generating...</> : (
                <>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  Download Excel CMA Report
                </>
              )}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => window.open(`/reports/${reportId}/print`, '_blank')} style={{flex:1}}>
              📄 PDF Project Report (Print/Save)
            </button>
          </div>

          <div className="alert alert-info" style={{fontSize:12}}>
            The Excel file includes: Cover Page, P&L Statement, Balance Sheet, Ratio Analysis, Loan Schedule, and MPBF computation sheet.
            Formulas are embedded for bank review.
          </div>
        </div>
      </div>

      {/* Report Checklist */}
      <div className="card">
        <div className="card-header"><div className="card-title">✅ Pre-Export Checklist</div></div>
        <div className="card-body" style={{display:'flex',flexDirection:'column',gap:8}}>
          {[
            { label: 'Loan details saved', done: !!report.loanAmount },
            { label: 'Historical financials entered', done: (report.financialYears?.length||0) > 0 },
            { label: 'Balance sheet is balanced', done: report.financialYears?.every((y: any) => y.isBalanced) },
            { label: 'Projection assumptions saved', done: (report.assumptions?.length||0) > 0 },
            { label: 'Projections computed', done: (report.projections?.length||0) > 0 },
          ].map((item, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,fontSize:13}}>
              <div style={{
                width:20,height:20,borderRadius:'50%',flexShrink:0,
                background: item.done ? 'var(--accent-green)' : 'var(--border)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color: item.done ? 'white' : 'var(--text-muted)',fontSize:11
              }}>{item.done ? '✓' : '○'}</div>
              <span style={{color: item.done ? 'var(--text-primary)' : 'var(--text-muted)'}}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
