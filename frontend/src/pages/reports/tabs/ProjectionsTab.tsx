import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const fmt = (n: number, dp = 2) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

function RatioRow({ label, value, benchmark, inverse = false }: { label: string; value: number; benchmark: number; inverse?: boolean }) {
  const isGood = inverse ? value < benchmark : value >= benchmark;
  const isWarn = inverse ? (value >= benchmark && value < benchmark * 1.5) : (value < benchmark && value >= benchmark * 0.7);
  const color = isGood ? 'var(--accent-green)' : isWarn ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <tr>
      <td style={{fontSize:12}}>{label}</td>
      <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,color}}>{fmt(value)}</td>
      <td style={{textAlign:'right',fontSize:11,color:'var(--text-muted)'}}>{benchmark}+</td>
      <td style={{textAlign:'right'}}>
        <span style={{fontSize:11,fontWeight:600,color}}>{isGood ? '✓ Good' : isWarn ? '⚠ Fair' : '✗ Weak'}</span>
      </td>
    </tr>
  );
}

export default function ProjectionsTab({ reportId }: { reportId: string }) {
  const [data, setData] = useState<any>({ projections: [], loanSchedule: null });
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeYear, setActiveYear] = useState(0);

  useEffect(() => { fetchProjections(); }, [reportId]);

  const fetchProjections = () => {
    setLoading(true);
    api.projections.get(reportId).then(setData).catch(console.error).finally(() => setLoading(false));
  };

  const handleCompute = async () => {
    setComputing(true); setMsg('');
    try {
      await api.projections.compute(reportId);
      await fetchProjections();
      setMsg('✓ Projections computed successfully!');
      setActiveYear(0);
    } catch (err: any) { setMsg('Error: ' + err.message); }
    finally { setComputing(false); setTimeout(() => setMsg(''), 5000); }
  };

  const { projections, loanSchedule } = data;

  if (loading) return <div style={{padding:40,textAlign:'center'}}><div className="spinner spinner-dark" style={{width:28,height:28,margin:'0 auto'}} /></div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h3 style={{fontSize:15,fontWeight:700}}>Financial Projections & Ratio Analysis</h3>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>
            {projections.length > 0 ? `${projections.length} year projections computed` : 'Click "Compute" to generate projections from your assumptions'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCompute} disabled={computing}>
          {computing ? <><span className="spinner" />Computing...</> : '⚡ Compute Projections'}
        </button>
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      {projections.length === 0 ? (
        <div className="card" style={{padding:'60px 20px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>📉</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>No projections yet</div>
          <div style={{color:'var(--text-muted)',marginBottom:20}}>
            Complete Historical Financials and Assumptions first, then click Compute.
          </div>
          <button className="btn btn-primary" onClick={handleCompute} disabled={computing}>
            {computing ? <><span className="spinner" />Computing...</> : '⚡ Compute Now'}
          </button>
        </div>
      ) : (
        <>
          {/* Year Tabs */}
          <div className="tab-bar">
            {projections.map((p: any, i: number) => (
              <button key={i} className={`tab-item ${activeYear === i ? 'active' : ''}`} onClick={() => setActiveYear(i)}>
                {p.year}
                <span style={{marginLeft:4,fontSize:10,color: (JSON.parse(p.ratios||'{}').dscr||0) >= 1.25 ? 'var(--accent-green)' : 'var(--accent-amber)'}}>●</span>
              </button>
            ))}
          </div>

          {projections[activeYear] && (() => {
            const p = projections[activeYear];
            const pl = p.plProjection ? JSON.parse(p.plProjection) : {};
            const ratios = p.ratios ? JSON.parse(p.ratios) : {};
            const cf = p.cfProjection ? JSON.parse(p.cfProjection) : {};

            return (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                {/* P&L Summary */}
                <div className="card">
                  <div className="card-header"><div className="card-title">📊 P&L Summary — {p.year}</div></div>
                  <div className="table-wrapper" style={{border:'none'}}>
                    <table className="data-table financial-table">
                      <thead><tr><th style={{textAlign:'left'}}>Particulars</th><th>Amount (₹ L)</th></tr></thead>
                      <tbody>
                        {[
                          { label: 'Gross Sales', val: pl.grossSales, bold: true },
                          { label: 'Other Income', val: pl.otherIncome },
                          { label: 'Raw Material Cost', val: -(pl.rawMaterial||0) },
                          { label: 'Gross Profit', val: (pl.grossSales||0) + (pl.otherIncome||0) - (pl.rawMaterial||0), bold: true, border: true },
                          { label: 'Operating Expenses', val: -((pl.salaryWages||0)+(pl.powerFuel||0)+(pl.manufacturingExp||0)+(pl.adminExp||0)+(pl.sellingExp||0)+(pl.rent||0)+(pl.repairMaintenance||0)) },
                          { label: 'EBITDA', val: ratios.ebitda, bold: true, border: true, color: 'var(--accent-green)' },
                          { label: 'Depreciation', val: -(pl.depreciation||0) },
                          { label: 'Interest', val: -(pl.interestExp||0) },
                          { label: 'PBT', val: ratios.ebit - (pl.interestExp||0), bold: true },
                          { label: 'Tax', val: -(pl.taxExpense||0) },
                          { label: 'PAT (Net Profit)', val: ratios.pat, bold: true, border: true, color: (ratios.pat||0) > 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                        ].map((row, i) => (
                          <tr key={i} style={row.bold ? {fontWeight:700} : {}}>
                            <td style={{textAlign:'left', borderTop: row.border ? '2px solid var(--primary)' : undefined, color: row.color}}>{row.label}</td>
                            <td style={{color: row.color || ((row.val||0) < 0 ? 'var(--accent-red)' : 'inherit'), borderTop: row.border ? '2px solid var(--primary)' : undefined}}>
                              {fmt(row.val||0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ratios */}
                <div className="card">
                  <div className="card-header"><div className="card-title">📈 Banking Ratios — {p.year}</div></div>
                  <div className="table-wrapper" style={{border:'none'}}>
                    <table className="data-table">
                      <thead><tr><th>Ratio</th><th style={{textAlign:'right'}}>Value</th><th style={{textAlign:'right'}}>Benchmark</th><th style={{textAlign:'right'}}>Status</th></tr></thead>
                      <tbody>
                        <RatioRow label="DSCR" value={ratios.dscr||0} benchmark={1.25} />
                        <RatioRow label="Current Ratio" value={ratios.currentRatio||0} benchmark={1.33} />
                        <RatioRow label="Quick Ratio" value={ratios.quickRatio||0} benchmark={1.0} />
                        <RatioRow label="Debt Equity Ratio" value={ratios.debtEquityRatio||0} benchmark={2.0} inverse />
                        <RatioRow label="Interest Coverage" value={ratios.interestCoverageRatio||0} benchmark={2.0} />
                        <RatioRow label="Net Profit Margin %" value={ratios.netMarginPct||0} benchmark={5} />
                        <RatioRow label="EBITDA Margin %" value={ratios.ebitdaMarginPct||0} benchmark={15} />
                        <tr style={{fontWeight:700,borderTop:'2px solid var(--border)'}}>
                          <td>Net Worth</td><td style={{textAlign:'right',fontFamily:'monospace'}}>₹{fmt(ratios.netWorth||0)}</td>
                          <td /><td />
                        </tr>
                        <tr style={{fontWeight:700}}>
                          <td>MPBF</td><td style={{textAlign:'right',fontFamily:'monospace'}}>₹{fmt(ratios.mpbf||0)}</td>
                          <td /><td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cash Flow */}
                <div className="card">
                  <div className="card-header"><div className="card-title">💵 Cash Flow — {p.year}</div></div>
                  <div className="card-body" style={{display:'flex',flexDirection:'column',gap:12}}>
                    {[
                      { label: 'Operating Cash Flow', value: cf.operatingCashFlow, color: 'var(--accent-green)' },
                      { label: 'Investing Cash Flow', value: cf.investingCashFlow, color: 'var(--accent-amber)' },
                      { label: 'Financing Cash Flow', value: cf.financingCashFlow, color: 'var(--primary)' },
                      { label: 'Net Cash Flow', value: cf.netCashFlow, color: (cf.netCashFlow||0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                    ].map(r => (
                      <div key={r.label} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'var(--bg-surface-2)',borderRadius:6}}>
                        <span style={{fontSize:13,fontWeight:500}}>{r.label}</span>
                        <span style={{fontSize:14,fontWeight:700,color:r.color,fontFamily:'monospace'}}>
                          {(r.value||0) < 0 ? '(' : ''}₹{fmt(Math.abs(r.value||0))}{(r.value||0) < 0 ? ')' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Working Capital */}
                <div className="card">
                  <div className="card-header"><div className="card-title">🔄 Working Capital Analysis</div></div>
                  <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
                    {[
                      { label: 'Debtor Days', value: `${fmt(ratios.debtorDays||0, 0)} days` },
                      { label: 'Creditor Days', value: `${fmt(ratios.creditorDays||0, 0)} days` },
                      { label: 'Inventory Days', value: `${fmt(ratios.inventoryDays||0, 0)} days` },
                      { label: 'WC Cycle', value: `${fmt(ratios.workingCapitalCycle||0, 0)} days` },
                      { label: 'Net Working Capital', value: `₹${fmt(ratios.workingCapital||0)} L` },
                      { label: 'MPBF (Method II)', value: `₹${fmt(ratios.mpbf||0)} L` },
                      { label: 'Asset Turnover', value: `${fmt(ratios.assetTurnover||0)}x` },
                    ].map(r => (
                      <div key={r.label} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                        <span style={{color:'var(--text-secondary)'}}>{r.label}</span>
                        <span style={{fontWeight:600,fontFamily:'monospace'}}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* All Years DSCR Summary */}
          {projections.length > 1 && (
            <div className="card">
              <div className="card-header"><div className="card-title">📊 DSCR Summary — All Years</div></div>
              <div className="table-wrapper" style={{border:'none'}}>
                <table className="data-table financial-table">
                  <thead>
                    <tr>
                      <th style={{textAlign:'left'}}>Particulars</th>
                      {projections.map((p: any) => <th key={p.year}>{p.year}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Net Sales (₹L)', key: 'grossSales', type: 'pl' },
                      { label: 'PAT (₹L)', key: 'pat', type: 'ratio' },
                      { label: 'DSCR', key: 'dscr', type: 'ratio' },
                      { label: 'Current Ratio', key: 'currentRatio', type: 'ratio' },
                      { label: 'Debt Equity Ratio', key: 'debtEquityRatio', type: 'ratio' },
                      { label: 'Net Margin %', key: 'netMarginPct', type: 'ratio' },
                    ].map(row => (
                      <tr key={row.label}>
                        <td style={{textAlign:'left',fontWeight:600}}>{row.label}</td>
                        {projections.map((p: any) => {
                          const val = row.type === 'ratio'
                            ? (p.ratios ? JSON.parse(p.ratios) : {})[row.key]
                            : (p.plProjection ? JSON.parse(p.plProjection) : {})[row.key];
                          return <td key={p.year}>{fmt(val||0)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Loan Schedule */}
          {loanSchedule?.scheduleData && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">💳 Loan Repayment Schedule (Annual)</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>
                  EMI: ₹{fmt(loanSchedule.emiAmount||0)} / month · Rate: {loanSchedule.interestRate}% p.a.
                </div>
              </div>
              <div className="table-wrapper" style={{border:'none'}}>
                <table className="data-table financial-table">
                  <thead>
                    <tr>
                      <th style={{textAlign:'left'}}>Year</th>
                      <th>Opening Balance</th><th>Principal Repaid</th><th>Interest Paid</th>
                      <th>Total Payment</th><th>Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(typeof loanSchedule.scheduleData === 'string' ? JSON.parse(loanSchedule.scheduleData) : loanSchedule.scheduleData)
                      .filter((r: any) => !r.isMoratorium || r.month % 12 === 0)
                      .reduce((acc: any[], row: any) => {
                        const yr = Math.ceil(row.month / 12);
                        if (!acc[yr]) acc[yr] = { year: yr, principal: 0, interest: 0, total: 0, closing: row.closingBalance };
                        acc[yr].principal += row.principal;
                        acc[yr].interest += row.interest;
                        acc[yr].total += row.emi;
                        acc[yr].closing = row.closingBalance;
                        return acc;
                      }, []).filter(Boolean).map((yr: any) => (
                        <tr key={yr.year}>
                          <td style={{textAlign:'left',fontWeight:600}}>Year {yr.year}</td>
                          <td>—</td>
                          <td>{fmt(yr.principal)}</td>
                          <td>{fmt(yr.interest)}</td>
                          <td style={{fontWeight:700}}>{fmt(yr.total)}</td>
                          <td>{fmt(yr.closing)}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
