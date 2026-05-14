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

export default function FinancialInputTab({ reportId, onUpdate }: { reportId: string; onUpdate: () => void }) {
  const [years, setYears] = useState<string[]>(DEFAULT_YEARS);
  const [plData, setPlData] = useState<Record<string, Record<string, number>>>({});
  const [bsAssets, setBsAssets] = useState<Record<string, Record<string, number>>>({});
  const [bsLiab, setBsLiab] = useState<Record<string, Record<string, number>>>({});
  const [activeYear, setActiveYear] = useState(DEFAULT_YEARS[DEFAULT_YEARS.length - 1]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [existingYears, setExistingYears] = useState<any[]>([]);
  const [newYear, setNewYear] = useState('');

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
  const getGross = (y: string) => (plData[y]?.grossSales || 0) + (plData[y]?.otherIncome || 0);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Year Selector */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📈 Historical Financial Data</div>
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

      {/* Balance Sheet Check */}
      {!isBalanced(activeYear) && (bsAssets[activeYear] || bsLiab[activeYear]) && (
        <div className="alert alert-warning">
          ⚠ Balance Sheet not balanced for {activeYear}: Assets = ₹{fmt(getTotalAssets(activeYear))} | Liabilities = ₹{fmt(getTotalLiab(activeYear))} | Diff = ₹{fmt(Math.abs(getTotalAssets(activeYear) - getTotalLiab(activeYear)))}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        {/* P&L */}
        <div className="card" style={{gridColumn:'1/3'}}>
          <div className="card-header">
            <div className="card-title">Profit & Loss Statement — {activeYear}</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--accent-green)'}}>
              Net Sales: ₹{fmt(getGross(activeYear))} L
            </div>
          </div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:0}}>
            {['INCOME','EXPENSES','DEDUCTIONS'].map(section => (
              <div key={section}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:'var(--text-muted)',textTransform:'uppercase',padding:'8px 0 4px',borderTop:section==='INCOME'?'none':'1px solid var(--border)',marginTop:section==='INCOME'?0:8}}>
                  {section === 'INCOME' ? 'Income' : section === 'EXPENSES' ? 'Operating Expenses' : 'Below EBITDA'}
                </div>
                {PL_FIELDS.filter(f => f.section === section).map(f => (
                  <div key={f.key} style={{display:'flex',alignItems:'center',gap:12,padding:'4px 0'}}>
                    <label style={{fontSize:12,color:'var(--text-secondary)',flex:1}}>{f.label}</label>
                    <input type="number" className="form-input" placeholder="0"
                      style={{width:120,textAlign:'right',padding:'5px 8px'}}
                      value={plData[activeYear]?.[f.key] || ''}
                      onChange={e => setPlField(activeYear, f.key, Number(e.target.value))} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Balance Sheet Summary */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Liabilities</div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--primary)'}}>₹{fmt(getTotalLiab(activeYear))} L</div>
            </div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:4}}>
              {BS_LIAB_FIELDS.map(f => (
                <div key={f.key} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
                  <label style={{fontSize:11,color:'var(--text-secondary)',flex:1}}>{f.label}</label>
                  <input type="number" className="form-input" placeholder="0"
                    style={{width:90,textAlign:'right',padding:'4px 6px',fontSize:11}}
                    value={bsLiab[activeYear]?.[f.key] || ''}
                    onChange={e => setLiabField(activeYear, f.key, Number(e.target.value))} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Assets</div>
              <div style={{fontSize:13,fontWeight:700,color: isBalanced(activeYear) ? 'var(--accent-green)' : 'var(--accent-red)'}}>
                ₹{fmt(getTotalAssets(activeYear))} L {isBalanced(activeYear) ? '✓' : '✗'}
              </div>
            </div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:4}}>
              {BS_ASSET_FIELDS.map(f => (
                <div key={f.key} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
                  <label style={{fontSize:11,color:'var(--text-secondary)',flex:1}}>{f.label}</label>
                  <input type="number" className="form-input" placeholder="0"
                    style={{width:90,textAlign:'right',padding:'4px 6px',fontSize:11}}
                    value={bsAssets[activeYear]?.[f.key] || ''}
                    onChange={e => setAssetField(activeYear, f.key, Number(e.target.value))} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" />Saving...</> : `💾 Save ${activeYear}`}
        </button>
      </div>
    </div>
  );
}
