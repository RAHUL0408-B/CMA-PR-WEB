import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import LoanTab from './tabs/LoanTab';
import FinancialInputTab from './tabs/FinancialInputTab';
import AssumptionsTab from './tabs/AssumptionsTab';
import ProjectionsTab from './tabs/ProjectionsTab';
import AICommentaryTab from './tabs/AICommentaryTab';
import ExportTab from './tabs/ExportTab';

const TABS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'loan', label: 'Loan Details', icon: '🏦' },
  { key: 'financials', label: 'Historical Financials', icon: '📈' },
  { key: 'assumptions', label: 'Assumptions', icon: '⚙️' },
  { key: 'projections', label: 'Projections & Ratios', icon: '📉' },
  { key: 'ai', label: 'AI Commentary', icon: '🤖' },
  { key: 'export', label: 'Export Reports', icon: '📥' },
];

export default function ReportWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchReport = useCallback(() => {
    if (!id) return;
    api.reports.get(id).then(setReport).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const saveField = async (data: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.reports.update(id, data);
      setReport((r: any) => ({ ...r, ...updated }));
      setSaveMsg('Saved'); setTimeout(() => setSaveMsg(''), 2000);
    } catch (err: any) { setSaveMsg('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string,string> = {DRAFT:'badge-gray',IN_PROGRESS:'badge-amber',REVIEW:'badge-blue',COMPLETED:'badge-green',EXPORTED:'badge-purple'};
    return <span className={`badge ${map[s]||'badge-gray'}`}>{s}</span>;
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400}}>
      <div className="spinner spinner-dark" style={{width:28,height:28}} />
    </div>
  );
  if (!report) return <div className="alert alert-error">Report not found</div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 6 }}>
          <button onClick={() => navigate(`/clients/${report.clientId}`)} className="btn btn-ghost btn-sm" style={{padding:'4px 8px'}}>
            ← {report.client?.name}
          </button>
          {statusBadge(report.status)}
          {saving && <span style={{fontSize:11,color:'var(--text-muted)'}}>Saving...</span>}
          {saveMsg && <span style={{fontSize:11,color:'var(--accent-green)'}}>{saveMsg}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 className="page-title" style={{fontSize:20}}>{report.title}</h1>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>
              <span className="badge badge-blue" style={{fontSize:10,marginRight:6}}>{report.reportType?.replace(/_/g,' ')}</span>
              {report.client?.businessName || report.client?.name}
              {report.loanAmount && ` · ₹${Number(report.loanAmount).toLocaleString('en-IN')} Lakhs`}
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-secondary btn-sm" onClick={() => saveField({ status: 'COMPLETED' })}>
              Mark Complete
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-item ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            <span style={{marginRight:5}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{position:'relative'}}>
        {activeTab === 'overview' && <OverviewTab report={report} onSave={saveField} />}
        {activeTab === 'loan' && <LoanTab report={report} onSave={saveField} />}
        {activeTab === 'financials' && <FinancialInputTab reportId={id!} onUpdate={fetchReport} />}
        {activeTab === 'assumptions' && <AssumptionsTab reportId={id!} />}
        {activeTab === 'projections' && <ProjectionsTab reportId={id!} />}
        {activeTab === 'ai' && <AICommentaryTab reportId={id!} report={report} />}
        {activeTab === 'export' && <ExportTab reportId={id!} report={report} />}
      </div>
    </div>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================
function OverviewTab({ report, onSave }: { report: any; onSave: (d: any) => void }) {
  const infoItems = [
    { label: 'Client', value: report.client?.name },
    { label: 'Business', value: report.client?.businessName },
    { label: 'Industry', value: report.client?.industryType },
    { label: 'PAN', value: report.client?.pan },
    { label: 'Constitution', value: report.client?.constitution },
    { label: 'Promoter', value: report.client?.promoterName },
    { label: 'Bank', value: report.bankName || report.client?.existingBanker },
    { label: 'Loan Type', value: report.loanType },
    { label: 'Loan Amount', value: report.loanAmount ? `₹${Number(report.loanAmount).toLocaleString('en-IN')} Lakhs` : null },
    { label: 'Interest Rate', value: report.interestRate ? `${report.interestRate}% p.a.` : null },
    { label: 'Tenure', value: report.loanTenure ? `${report.loanTenure} months` : null },
  ];

  const stats = [
    { label: 'Financial Years', value: report._count?.financialYears || report.financialYears?.length || 0, color: '' },
    { label: 'Generated Files', value: report._count?.generatedFiles || 0, color: 'green' },
    { label: 'Report Status', value: report.status, color: 'purple' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
      <div>
        <div className="card mb-4">
          <div className="card-header"><div className="card-title">Report Information</div></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {infoItems.filter(i => i.value).map(i => (
                <div key={i.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{i.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{i.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Quick Edit — Report Title</div></div>
          <div className="card-body">
            <div style={{display:'flex',gap:10}}>
              <input className="form-input" defaultValue={report.title}
                onBlur={e => onSave({ title: e.target.value })} style={{flex:1}} />
              <select className="form-select" defaultValue={report.status}
                onChange={e => onSave({ status: e.target.value })} style={{width:160}}>
                {['DRAFT','IN_PROGRESS','REVIEW','COMPLETED','EXPORTED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {stats.map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}

        <div className="card">
          <div className="card-header"><div className="card-title">Workflow</div></div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              { step: 'Loan Details', done: !!report.loanAmount },
              { step: 'Financial Data', done: (report.financialYears?.length || 0) > 0 },
              { step: 'Assumptions', done: (report.assumptions?.length || 0) > 0 },
              { step: 'Projections', done: (report.projections?.length || 0) > 0 },
              { step: 'AI Commentary', done: false },
              { step: 'Export', done: (report.generatedFiles?.length || 0) > 0 },
            ].map((item, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
                <div style={{
                  width:18,height:18,borderRadius:'50%',flexShrink:0,
                  background: item.done ? 'var(--accent-green)' : 'var(--border)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color: item.done ? 'white' : 'var(--text-muted)',fontSize:10,fontWeight:700
                }}>{item.done ? '✓' : i+1}</div>
                <span style={{color: item.done ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: item.done ? 600 : 400}}>
                  {item.step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
