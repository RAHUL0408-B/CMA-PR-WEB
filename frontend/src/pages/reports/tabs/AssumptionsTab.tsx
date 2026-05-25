import { useEffect, useState } from 'react';
import { api, safeParseJSON } from '../../../lib/api';

const DEFAULT_ASSUMPTIONS = {
  salesGrowthPct: 15, rawMaterialPct: 60, salaryGrowthPct: 10,
  adminExpensePct: 5, powerExpensePct: 3, interestRate: 12,
  depreciationRate: 10, taxRate: 25, inflationRate: 6,
  capacityUtilization: [70, 80, 85, 90, 95],
  debtorDays: 45, creditorDays: 30, inventoryDays: 60,
  projectionYears: 5
};

export default function AssumptionsTab({ reportId }: { reportId: string }) {
  const [form, setForm] = useState(DEFAULT_ASSUMPTIONS);
  const [capUtil, setCapUtil] = useState([70, 80, 85, 90, 95]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.projections.getAssumptions(reportId).then(a => {
      if (a) {
        setForm({ ...DEFAULT_ASSUMPTIONS, ...a, capacityUtilization: [] });
        setCapUtil(typeof a.capacityUtilization === 'string' ? safeParseJSON(a.capacityUtilization) : (a.capacityUtilization || [70,80,85,90,95]));
      }
    }).catch(console.error);
  }, [reportId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({...f, [k]: Number(e.target.value)}));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await api.projections.saveAssumptions(reportId, { ...form, capacityUtilization: capUtil });
      setMsg('Assumptions saved!');
    } catch (err: any) { setMsg('Error: ' + err.message); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const groups = [
    {
      title: 'Growth Assumptions', color: 'var(--primary)',
      fields: [
        { key: 'salesGrowthPct', label: 'Sales Growth Rate', suffix: '% YoY' },
        { key: 'salaryGrowthPct', label: 'Salary & Wages Growth', suffix: '% YoY' },
        { key: 'inflationRate', label: 'Inflation Rate', suffix: '% YoY' },
      ]
    },
    {
      title: 'Cost Structure', color: 'var(--accent-amber)',
      fields: [
        { key: 'rawMaterialPct', label: 'Raw Material as % of Sales', suffix: '% of Sales' },
        { key: 'adminExpensePct', label: 'Admin Expense as % of Sales', suffix: '% of Sales' },
        { key: 'powerExpensePct', label: 'Power & Fuel as % of Sales', suffix: '% of Sales' },
      ]
    },
    {
      title: 'Financial Parameters', color: 'var(--accent-green)',
      fields: [
        { key: 'interestRate', label: 'Interest Rate on Loan', suffix: '% p.a.' },
        { key: 'depreciationRate', label: 'Depreciation Rate (WDV)', suffix: '% p.a.' },
        { key: 'taxRate', label: 'Income Tax Rate', suffix: '% of PBT' },
      ]
    },
    {
      title: 'Working Capital Cycle', color: 'var(--accent-purple)',
      fields: [
        { key: 'debtorDays', label: 'Debtor Collection Period', suffix: 'days' },
        { key: 'creditorDays', label: 'Creditor Payment Period', suffix: 'days' },
        { key: 'inventoryDays', label: 'Inventory Holding Period', suffix: 'days' },
      ]
    }
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {groups.map(g => (
          <div className="card" key={g.title}>
            <div className="card-header" style={{borderTop:`3px solid ${g.color}`}}>
              <div className="card-title">{g.title}</div>
            </div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              {g.fields.map(f => (
                <div key={f.key}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <label style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)'}}>{f.label}</label>
                    <span style={{fontSize:12,fontWeight:700,color:g.color}}>
                      {(form as any)[f.key]}{f.suffix}
                    </span>
                  </div>
                  <input type="range" style={{width:'100%',accentColor:g.color}}
                    min={0} max={f.suffix.includes('days') ? 180 : 100} step={1}
                    value={(form as any)[f.key]}
                    onChange={set(f.key as keyof typeof form)} />
                  <input type="number" className="form-input" style={{marginTop:4,textAlign:'right'}}
                    value={(form as any)[f.key]} onChange={set(f.key as keyof typeof form)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Capacity Utilization */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🏭 Capacity Utilization by Projection Year</div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>
            WC Cycle: {form.debtorDays + form.inventoryDays - form.creditorDays} days
          </div>
        </div>
        <div className="card-body">
          <div style={{display:'flex',gap:16}}>
            {capUtil.map((v, i) => (
              <div key={i} style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',marginBottom:6}}>Year {i+1}</div>
                <input type="number" className="form-input" style={{textAlign:'center'}}
                  min={0} max={100} value={v}
                  onChange={e => setCapUtil(c => c.map((x, j) => j === i ? Number(e.target.value) : x))} />
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{v}%</div>
                <div style={{
                  height:6, background:'var(--border)', borderRadius:4, marginTop:6,
                  position:'relative', overflow:'hidden'
                }}>
                  <div style={{
                    position:'absolute', left:0, top:0, bottom:0,
                    width:`${v}%`, background:'var(--primary)', borderRadius:4,
                    transition:'width 0.3s'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" />Saving...</> : '💾 Save Assumptions'}
        </button>
      </div>
    </div>
  );
}
