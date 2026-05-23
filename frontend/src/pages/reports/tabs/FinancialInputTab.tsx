import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const PL_FIELDS = [
  { key: 'grossSales', label: 'Gross Sales / Turnover', section: 'INCOME' },
  { key: 'otherIncome', label: 'Other Income', section: 'INCOME' },
  { key: 'rawMaterial', label: 'Raw Material / Purchase Cost', section: 'EXPENSES' },
  { key: 'salaryWages', label: 'Salary & Wages', section: 'EXPENSES' },
  { key: 'powerFuel', label: 'Power & Fuel', section: 'EXPENSES' },
  { key: 'manufacturingExp', label: 'Manufacturing Expenses', section: 'EXPENSES' },
  { key: 'adminExp', label: 'Administration Expenses', section: 'EXPENSES' },
  { key: 'sellingExp', label: 'Selling & Distribution Expenses', section: 'EXPENSES' },
  { key: 'rent', label: 'Rent / Lease', section: 'EXPENSES' },
  { key: 'repairMaintenance', label: 'Repair & Maintenance', section: 'EXPENSES' },
  { key: 'depreciation', label: 'Depreciation', section: 'DEDUCTIONS' },
  { key: 'interestExp', label: 'Interest / Finance Charges', section: 'DEDUCTIONS' },
  { key: 'taxExpense', label: 'Income Tax Provision', section: 'DEDUCTIONS' },
];

const BS_LIAB_FIELDS = [
  { key: 'shareCapital', label: 'Share Capital / Capital Contribution', section: 'NETWORTH' },
  { key: 'reserves', label: 'Reserves & Surplus / Profit', section: 'NETWORTH' },
  { key: 'securedLoan', label: 'Secured Term Loans', section: 'DEBT' },
  { key: 'unsecuredLoan', label: 'Unsecured Loans', section: 'DEBT' },
  { key: 'ccOdLimit', label: 'CC / OD / Working Capital Limits', section: 'DEBT' },
  { key: 'tradeCreditors', label: 'Trade Creditors / Sundry Creditors', section: 'CURRENT' },
  { key: 'otherCurrentLiab', label: 'Other Current Liabilities', section: 'CURRENT' },
  { key: 'provisions', label: 'Provisions & Contingencies', section: 'CURRENT' },
];

const BS_ASSET_FIELDS = [
  { key: 'landBuilding', label: 'Land & Building', section: 'FIXED' },
  { key: 'plantMachinery', label: 'Plant & Machinery', section: 'FIXED' },
  { key: 'furniture', label: 'Furniture & Fixtures', section: 'FIXED' },
  { key: 'vehicle', label: 'Vehicles', section: 'FIXED' },
  { key: 'investments', label: 'Investments', section: 'FIXED' },
  { key: 'inventory', label: 'Closing Stock / Inventory', section: 'CURRENT' },
  { key: 'sundryDebtors', label: 'Sundry Debtors / Trade Receivables', section: 'CURRENT' },
  { key: 'cashBank', label: 'Cash & Bank Balances', section: 'CURRENT' },
  { key: 'loansAdvances', label: 'Loans & Advances', section: 'CURRENT' },
  { key: 'otherCurrentAssets', label: 'Other Current Assets', section: 'CURRENT' },
];

const DEFAULT_YEARS = ['2021-22', '2022-23', '2023-24'];

export default function FinancialInputTab({ 
  reportId, 
  onUpdate, 
  type = 'ALL' 
}: { 
  reportId: string; 
  onUpdate: () => void;
  type?: 'ALL' | 'PL' | 'ASSETS' | 'LIABILITIES';
}) {
  const [years, setYears] = useState<string[]>(DEFAULT_YEARS);
  const [plData, setPlData] = useState<Record<string, Record<string, number>>>({});
  const [bsAssets, setBsAssets] = useState<Record<string, Record<string, number>>>({});
  const [bsLiab, setBsLiab] = useState<Record<string, Record<string, number>>>({});
  const [activeYear, setActiveYear] = useState(DEFAULT_YEARS[DEFAULT_YEARS.length - 1]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [existingYears, setExistingYears] = useState<any[]>([]);
  const [newYear, setNewYear] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  const handleAIExtract = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setAiMsg('');
    try {
      const res = await api.ai.parseFinancials(reportId, rawText);
      if (res.success && res.data) {
        const extracted = res.data;
        
        // Update states
        setPlData(d => ({ ...d, [activeYear]: { ...(d[activeYear] || {}), ...extracted.plData } }));
        setBsAssets(d => ({ ...d, [activeYear]: { ...(d[activeYear] || {}), ...extracted.bsAssets } }));
        setBsLiab(d => ({ ...d, [activeYear]: { ...(d[activeYear] || {}), ...extracted.bsLiabilities } }));
        
        setAiMsg(`✓ Data extracted successfully for ${activeYear}! Review the fields below and click "Save ${activeYear} Data" to commit.`);
        setRawText('');
      } else {
        setAiMsg('Error: Could not extract structured data.');
      }
    } catch (err: any) {
      setAiMsg('Error: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  useEffect(() => {
    api.financials.list(reportId).then(existing => {
      setExistingYears(existing);
      if (existing.length > 0) {
        const loadedYears = existing.map((y: any) => y.year);
        setYears(loadedYears);
        setActiveYear(loadedYears[loadedYears.length - 1]);
        const pl: any = {}, assets: any = {}, liab: any = {};
        existing.forEach((y: any) => {
          pl[y.year] = y.plData ? JSON.parse(y.plData) : {};
          assets[y.year] = y.bsAssets ? JSON.parse(y.bsAssets) : {};
          liab[y.year] = y.bsLiabilities ? JSON.parse(y.bsLiabilities) : {};
        });
        setPlData(pl); setBsAssets(assets); setBsLiab(liab);
      }
    }).catch(console.error);
  }, [reportId]);

  const setPlField = (year: string, field: string, value: number) =>
    setPlData(d => ({...d, [year]: {...(d[year] || {}), [field]: value}}));
  const setAssetField = (year: string, field: string, value: number) =>
    setBsAssets(d => ({...d, [year]: {...(d[year] || {}), [field]: value}}));
  const setLiabField = (year: string, field: string, value: number) =>
    setBsLiab(d => ({...d, [year]: {...(d[year] || {}), [field]: value}}));

  const getTotalAssets = (y: string) => Object.values(bsAssets[y] || {}).reduce((a,b) => a + (Number(b)||0), 0);
  const getTotalLiab = (y: string) => Object.values(bsLiab[y] || {}).reduce((a,b) => a + (Number(b)||0), 0);
  const isBalanced = (y: string) => Math.abs(getTotalAssets(y) - getTotalLiab(y)) < 1;

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await api.financials.upsert(reportId, {
        year: activeYear,
        plData: plData[activeYear] || {},
        bsAssets: bsAssets[activeYear] || {},
        bsLiabilities: bsLiab[activeYear] || {}
      });
      setMsg('✓ Saved ' + activeYear);
      onUpdate();
    } catch (err: any) { setMsg('Error: ' + err.message); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const addYear = () => {
    if (newYear && !years.includes(newYear)) {
      setYears(y => [...y, newYear]);
      setActiveYear(newYear);
      setNewYear('');
    }
  };

  const fmt = (n: number) => (n || 0).toLocaleString('en-IN');
  
  const showPL = type === 'ALL' || type === 'PL';
  const showAssets = type === 'ALL' || type === 'ASSETS';
  const showLiab = type === 'ALL' || type === 'LIABILITIES';

  const getPLValue = (field: string) => plData[activeYear]?.[field] || 0;
  const grossProfit = (getPLValue('grossSales') + getPLValue('otherIncome')) - getPLValue('rawMaterial');
  const ebitda = grossProfit - (getPLValue('salaryWages') + getPLValue('powerFuel') + getPLValue('manufacturingExp') + getPLValue('adminExp') + getPLValue('sellingExp') + getPLValue('rent') + getPLValue('repairMaintenance'));
  const pbt = ebitda - (getPLValue('depreciation') + getPLValue('interestExp'));
  const pat = pbt - getPLValue('taxExpense');

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Year Selector */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Select Financial Year</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input className="form-input" placeholder="e.g., 2024-25" value={newYear}
              onChange={e => setNewYear(e.target.value)} style={{width:110}} />
            <button className="btn btn-secondary btn-sm" onClick={addYear}>+ Add Year</button>
          </div>
        </div>
        <div className="card-body" style={{paddingBottom:0}}>
          <div className="tab-bar" style={{marginBottom:0}}>
            {years.map(y => (
              <button key={y} className={`tab-item ${activeYear === y ? 'active' : ''}`} onClick={() => setActiveYear(y)}>
                {y}
                {existingYears.find((e: any) => e.year === y) && <span style={{marginLeft:4,color:'var(--accent-green)',fontSize:10}}>●</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Fast Data Entry */}
      <div className="card" style={{ border: '1px solid #7c3aed33', background: '#fcfaff' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowAiPanel(!showAiPanel)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#6d28d9' }}>AI Fast Data Entry — {activeYear}</div>
              <div style={{ fontSize: 11, color: '#7c3aedaa' }}>Paste audited statements or trial balances to auto-fill this page</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ borderColor: '#7c3aed44', color: '#6d28d9' }}>
            {showAiPanel ? 'Hide Panel' : 'Show Panel'}
          </button>
        </div>
        
        {showAiPanel && (
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #7c3aed1a' }}>
            <textarea
              className="cma-textarea"
              style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 13, border: '1px solid #7c3aed22' }}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`Example:
Gross sales: 120 Lakhs
Salary: 12 Lakhs
Electricity/Power: 4 Lakhs
Raw material: 65 Lakhs
Term Loans: 25 Lakhs
Cash balance: 5 Lakhs...`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Note: This will populate numbers for the selected year <strong>{activeYear}</strong> in the forms below.
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAIExtract}
                disabled={parsing || !rawText.trim()}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none' }}
              >
                {parsing ? 'Parsing Statement...' : '⚡ Extract & Autofill'}
              </button>
            </div>
          </div>
        )}
        
        {aiMsg && (
          <div style={{ 
            padding: '12px 16px', 
            background: aiMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', 
            color: aiMsg.startsWith('Error') ? '#991b1b' : '#166534',
            borderTop: '1px solid #e2e8f0',
            fontSize: 13,
            fontWeight: 600
          }}>
            {aiMsg}
          </div>
        )}
      </div>

      <div className="cma-form-card">
        {showPL && (
          <div>
            <h2 className="cma-section-title">Operating Statement — {activeYear}</h2>
            {PL_FIELDS.map(f => (
              <div key={f.key} className="cma-form-group">
                <div className="cma-label">{f.label}</div>
                <div className="cma-input-wrapper">
                  <div className="cma-input-prefix">₹</div>
                  <input type="number" className="cma-input cma-input-prefixed" 
                    value={plData[activeYear]?.[f.key] || ''}
                    onChange={e => setPlField(activeYear, f.key, Number(e.target.value))} />
                </div>
              </div>
            ))}
            
            <div style={{borderTop:'2px solid #f1f5f9', marginTop:32, paddingTop:24}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
                <span style={{fontWeight:600}}>Gross Profit:</span>
                <span style={{fontWeight:700, color:'#7c3aed'}}>₹{fmt(grossProfit)}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
                <span style={{fontWeight:600}}>EBITDA:</span>
                <span style={{fontWeight:700, color:'#7c3aed'}}>₹{fmt(ebitda)}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{fontWeight:700, fontSize:16}}>Net Profit (PAT):</span>
                <span style={{fontWeight:800, fontSize:18, color:'#10b981'}}>₹{fmt(pat)}</span>
              </div>
            </div>
          </div>
        )}

        {showLiab && (
          <div>
            <h2 className="cma-section-title">Liabilities — {activeYear}</h2>
            {BS_LIAB_FIELDS.map(f => (
              <div key={f.key} className="cma-form-group">
                <div className="cma-label">{f.label}</div>
                <div className="cma-input-wrapper">
                  <div className="cma-input-prefix">₹</div>
                  <input type="number" className="cma-input cma-input-prefixed" 
                    value={bsLiab[activeYear]?.[f.key] || ''}
                    onChange={e => setLiabField(activeYear, f.key, Number(e.target.value))} />
                </div>
              </div>
            ))}
            <div style={{borderTop:'2px solid #f1f5f9', marginTop:32, paddingTop:24, display:'flex', justifyContent:'space-between'}}>
                <span style={{fontWeight:700, fontSize:16}}>Total Liabilities:</span>
                <span style={{fontWeight:800, fontSize:18, color:'#7c3aed'}}>₹{fmt(getTotalLiab(activeYear))}</span>
            </div>
          </div>
        )}

        {showAssets && (
          <div>
            <h2 className="cma-section-title">Assets — {activeYear}</h2>
            {BS_ASSET_FIELDS.map(f => (
              <div key={f.key} className="cma-form-group">
                <div className="cma-label">{f.label}</div>
                <div className="cma-input-wrapper">
                  <div className="cma-input-prefix">₹</div>
                  <input type="number" className="cma-input cma-input-prefixed" 
                    value={bsAssets[activeYear]?.[f.key] || ''}
                    onChange={e => setAssetField(activeYear, f.key, Number(e.target.value))} />
                </div>
              </div>
            ))}
            <div style={{borderTop:'2px solid #f1f5f9', marginTop:32, paddingTop:24, display:'flex', justifyContent:'space-between'}}>
                <span style={{fontWeight:700, fontSize:16}}>Total Assets:</span>
                <span style={{fontWeight:800, fontSize:18, color: isBalanced(activeYear) ? '#10b981' : '#ef4444'}}>
                  ₹{fmt(getTotalAssets(activeYear))}
                </span>
            </div>
          </div>
        )}

        <div style={{marginTop:32,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          {!isBalanced(activeYear) && (activeYear && (getTotalAssets(activeYear) > 0 || getTotalLiab(activeYear) > 0)) && (
            <div style={{color:'#ef4444', fontSize:13, fontWeight:600}}>⚠ Balance Sheet not balanced (Diff: ₹{fmt(Math.abs(getTotalAssets(activeYear) - getTotalLiab(activeYear)))})</div>
          )}
          <div />
          <div style={{display:'flex',gap:12}}>
            {msg && <span style={{alignSelf:'center',fontSize:13,color:'#10b981',fontWeight:600}}>{msg}</span>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : `💾 Save ${activeYear} Data`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
