import { useState } from 'react';
import { safeParseJSON } from '../../../lib/api';

const LOAN_TYPES = ['Term Loan','Working Capital','CC Limit','OD Limit','Mudra Loan','Machinery Loan','MSME Loan','Startup Loan','Vehicle Loan','LAP','Home Loan'];
const BANKS = ['SBI','HDFC Bank','ICICI Bank','Axis Bank','Bank of Baroda','Canara Bank','Punjab National Bank','Union Bank','Bank of India','UCO Bank','Indian Bank','Kotak Bank','Yes Bank','IDBI Bank','Federal Bank','SIDBI','NABARD','Other'];
const REPAYMENT_FREQ = ['Monthly','Quarterly','Half Yearly','Yearly'];

const PROJECT_COST_FIELDS = [
  { key: 'landCost', label: 'Land Cost' },
  { key: 'buildingCost', label: 'Building / Civil Work' },
  { key: 'plantMachinery', label: 'Plant & Machinery' },
  { key: 'furniture', label: 'Furniture & Fixtures' },
  { key: 'officeEquipment', label: 'Office Equipment' },
  { key: 'vehicle', label: 'Vehicle Cost' },
  { key: 'electricalInstallation', label: 'Electrical Installation' },
  { key: 'softwareCost', label: 'Software / ERP Cost' },
  { key: 'preliminaryExpenses', label: 'Preliminary Expenses' },
  { key: 'preOperativeExpenses', label: 'Pre-Operative Expenses' },
  { key: 'contingency', label: 'Contingency Expenses' },
  { key: 'workingCapitalMargin', label: 'Working Capital Margin' },
  { key: 'other', label: 'Other Project Costs' },
];

const FINANCE_FIELDS = [
  { key: 'promoterContribution', label: 'Promoter Contribution (Equity)' },
  { key: 'unsecuredLoan', label: 'Unsecured Loan / Director Loan' },
  { key: 'subsidy', label: 'Subsidy / Grant Amount' },
  { key: 'termLoan', label: 'Term Loan (Proposed)' },
  { key: 'workingCapital', label: 'Working Capital Loan' },
  { key: 'other', label: 'Other Sources' },
];

const fmt = (n: number) => n.toLocaleString('en-IN');

export default function LoanTab({ report, onSave }: { report: any; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    loanType: report.loanType || '',
    bankName: report.bankName || '',
    loanAmount: report.loanAmount || '',
    loanPurpose: report.loanPurpose || '',
    loanTenure: report.loanTenure || '',
    moratoriumMonths: report.moratoriumMonths || '',
    interestRate: report.interestRate || '',
    repaymentFreq: report.repaymentFreq || 'Monthly',
    existingEMI: report.existingEMI || '',
  });

  const [projectCost, setProjectCost] = useState<Record<string, number>>(
    report.projectCost ? (typeof report.projectCost === 'string' ? safeParseJSON(report.projectCost) : report.projectCost) : {}
  );
  const [meansOfFinance, setMeansOfFinance] = useState<Record<string, number>>(
    report.meansOfFinance ? (typeof report.meansOfFinance === 'string' ? safeParseJSON(report.meansOfFinance) : report.meansOfFinance) : {}
  );

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}));

  const totalProjectCost = Object.values(projectCost).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalFinance = Object.values(meansOfFinance).reduce((a, b) => a + (Number(b) || 0), 0);
  const isBalanced = Math.abs(totalProjectCost - totalFinance) < 1;

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await onSave({ ...form, projectCost, meansOfFinance });
      setMsg('Saved successfully!');
    } catch (err: any) { setMsg('Error: ' + err.message); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Loan Details */}
      <div className="card">
        <div className="card-header"><div className="card-title">🏦 Loan Requirement</div></div>
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label required">Loan Type</label>
              <select className="form-select" value={form.loanType} onChange={set('loanType')}>
                <option value="">Select Loan Type</option>
                {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bank / NBFC Name</label>
              <select className="form-select" value={form.bankName} onChange={set('bankName')}>
                <option value="">Select Bank</option>
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Loan Amount (₹ Lakhs)</label>
              <input type="number" className="form-input" placeholder="e.g., 50" value={form.loanAmount} onChange={set('loanAmount')} />
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Purpose of Loan</label>
              <textarea className="form-textarea" placeholder="Describe the purpose of loan..." value={form.loanPurpose} onChange={set('loanPurpose')} rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Tenure (Months)</label>
              <input type="number" className="form-input" placeholder="60" value={form.loanTenure} onChange={set('loanTenure')} />
            </div>
            <div className="form-group">
              <label className="form-label">Moratorium Period (Months)</label>
              <input type="number" className="form-input" placeholder="6" value={form.moratoriumMonths} onChange={set('moratoriumMonths')} />
            </div>
            <div className="form-group">
              <label className="form-label">Interest Rate (% p.a.)</label>
              <input type="number" step="0.01" className="form-input" placeholder="12.50" value={form.interestRate} onChange={set('interestRate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Repayment Frequency</label>
              <select className="form-select" value={form.repaymentFreq} onChange={set('repaymentFreq')}>
                {REPAYMENT_FREQ.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Existing EMI Obligations (₹/month)</label>
              <input type="number" className="form-input" placeholder="0" value={form.existingEMI} onChange={set('existingEMI')} />
            </div>
          </div>
        </div>
      </div>

      {/* Project Cost */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">📦 Project Cost</div>
            <div style={{fontSize:14,fontWeight:700,color:'var(--primary)'}}>₹{fmt(totalProjectCost)} L</div>
          </div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
            {PROJECT_COST_FIELDS.map(f => (
              <div key={f.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <label style={{fontSize:12,color:'var(--text-secondary)',minWidth:180}}>{f.label}</label>
                <input type="number" className="form-input" placeholder="0"
                  style={{width:120,textAlign:'right'}}
                  value={projectCost[f.key] || ''}
                  onChange={e => setProjectCost(p => ({...p, [f.key]: Number(e.target.value)}))} />
              </div>
            ))}
            <hr className="section-divider" />
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700}}>
              <span>Total Project Cost</span>
              <span style={{color:'var(--primary)'}}>₹{fmt(totalProjectCost)} L</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">💰 Means of Finance</div>
            <div style={{fontSize:14,fontWeight:700,color: isBalanced ? 'var(--accent-green)' : 'var(--accent-red)'}}>
              ₹{fmt(totalFinance)} L {isBalanced ? '✓' : '⚠'}
            </div>
          </div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
            {FINANCE_FIELDS.map(f => (
              <div key={f.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <label style={{fontSize:12,color:'var(--text-secondary)',minWidth:200}}>{f.label}</label>
                <input type="number" className="form-input" placeholder="0"
                  style={{width:120,textAlign:'right'}}
                  value={meansOfFinance[f.key] || ''}
                  onChange={e => setMeansOfFinance(m => ({...m, [f.key]: Number(e.target.value)}))} />
              </div>
            ))}
            <hr className="section-divider" />
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700}}>
              <span>Total Finance</span>
              <span style={{color: isBalanced ? 'var(--accent-green)' : 'var(--accent-red)'}}>₹{fmt(totalFinance)} L</span>
            </div>
            {!isBalanced && (
              <div className="alert alert-warning">
                ⚠ Means of Finance (₹{fmt(totalFinance)} L) ≠ Project Cost (₹{fmt(totalProjectCost)} L). Difference: ₹{fmt(Math.abs(totalProjectCost - totalFinance))} L
              </div>
            )}
            {isBalanced && totalProjectCost > 0 && (
              <div className="alert alert-success">✓ Project Cost balanced with Means of Finance</div>
            )}
          </div>
        </div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" />Saving...</> : '💾 Save Loan Details'}
        </button>
      </div>
    </div>
  );
}
