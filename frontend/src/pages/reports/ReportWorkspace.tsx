import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import FinancialInputTab from './tabs/FinancialInputTab';
import AssumptionsTab from './tabs/AssumptionsTab';
import ProjectionsTab from './tabs/ProjectionsTab';
import AICommentaryTab from './tabs/AICommentaryTab';
import ExportTab from './tabs/ExportTab';
import PreviewTab from './tabs/PreviewTab';
import CoverPageTab from './tabs/CoverPageTab';
import LoanTab from './tabs/LoanTab';

const CMA_TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'company', label: 'Company Details', icon: '🏢' },
  { key: 'loan', label: 'Project Cost & Loan', icon: '🏦' },
  { key: 'pl', label: 'Operating Statement', icon: '📄' },
  { key: 'assets', label: 'Assets', icon: '📊' },
  { key: 'liabilities', label: 'Liabilities', icon: '⚖️' },
  { key: 'cover', label: 'Edit Cover Page', icon: '📝' },
  { key: 'assumptions', label: 'Assumptions', icon: '⚙️' },
  { key: 'projections', label: 'Projections', icon: '📉' },
  { key: 'ai', label: 'AI Commentary', icon: '🤖' },
  { key: 'preview', label: 'Preview', icon: '👁️' },
  { key: 'download', label: 'Download', icon: '📥' },
];

export default function ReportWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchReport = useCallback(() => {
    if (!id) return;
    api.reports.get(id).then(setReport).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const saveReport = async (data: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.reports.update(id, data);
      setReport((r: any) => ({ ...r, ...updated }));
    } catch (err: any) { console.error(err); }
    finally { setSaving(false); }
  };

  const saveClient = async (data: any) => {
    if (!report?.clientId) return;
    setSaving(true);
    try {
      await api.clients.update(report.clientId, data);
      fetchReport();
    } catch (err: any) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
      <div className="spinner spinner-dark" style={{width:28,height:28}} />
    </div>
  );
  if (!report) return <div className="alert alert-error">Report not found</div>;

  return (
    <div className="cma-workspace">
      {/* Navigation Bar */}
      <div className="cma-nav">
        {CMA_TABS.map(t => (
          <button key={t.key} className={`cma-nav-item ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            <span style={{fontSize:16}}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
          {saving && <div className="spinner spinner-dark" style={{width:14,height:14}} />}
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('download')}>
            📥 Download
          </button>
        </div>
      </div>

      {/* Wizard Header */}
      <div className="cma-wizard-header" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Report Generation Wizard
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
            Progress: {Math.round((CMA_TABS.findIndex(t => t.key === activeTab) + 1) / CMA_TABS.length * 100)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
          <div style={{
            width: `${((CMA_TABS.findIndex(t => t.key === activeTab) + 1) / CMA_TABS.length) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Step Indicator Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {CMA_TABS.map((t, idx) => {
            const currentIdx = CMA_TABS.findIndex(tab => tab.key === activeTab);
            const isCompleted = idx < currentIdx;
            const isActive = idx === currentIdx;
            return (
              <button key={t.key} 
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 70,
                  opacity: isActive || isCompleted ? 1 : 0.45,
                  transition: 'opacity 0.2s ease',
                  padding: 4
                }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  background: isActive ? 'var(--primary)' : isCompleted ? 'var(--accent-green)' : '#f1f5f9',
                  color: isActive || isCompleted ? '#ffffff' : 'var(--text-secondary)',
                  border: `2px solid ${isActive ? 'var(--primary)' : isCompleted ? 'var(--accent-green)' : 'var(--border-strong)'}`
                }}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary)' : 'var(--text-secondary)', marginTop: 4, whiteSpace: 'nowrap' }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="cma-container">
        {activeTab === 'home' && <HomeTab report={report} />}
        {activeTab === 'company' && <CompanyDetailsTab report={report} onSave={saveClient} />}
        {activeTab === 'loan' && <LoanTab report={report} onSave={saveReport} />}
        {activeTab === 'pl' && <FinancialInputTab reportId={id!} type="PL" onUpdate={fetchReport} />}
        {activeTab === 'assets' && <FinancialInputTab reportId={id!} type="ASSETS" onUpdate={fetchReport} />}
        {activeTab === 'liabilities' && <FinancialInputTab reportId={id!} type="LIABILITIES" onUpdate={fetchReport} />}
        {activeTab === 'cover' && <CoverPageTab report={report} onSave={saveReport} />}
        {activeTab === 'assumptions' && <AssumptionsTab reportId={id!} />}
        {activeTab === 'projections' && <ProjectionsTab reportId={id!} />}
        {activeTab === 'ai' && <AICommentaryTab reportId={id!} report={report} />}
        {activeTab === 'preview' && <PreviewTab reportId={id!} />}
        {activeTab === 'download' && <ExportTab reportId={id!} report={report} />}
      </div>

      {/* Wizard Footer */}
      <div className="cma-wizard-footer" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        padding: '16px 24px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <button
          className="btn btn-secondary"
          disabled={activeTab === 'home'}
          onClick={() => {
            const idx = CMA_TABS.findIndex(t => t.key === activeTab);
            if (idx > 0) setActiveTab(CMA_TABS[idx - 1].key);
          }}
        >
          ← Previous Step
        </button>
        
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Step {CMA_TABS.findIndex(t => t.key === activeTab) + 1} of {CMA_TABS.length} · {CMA_TABS.find(t => t.key === activeTab)?.label}
        </div>

        <button
          className="btn btn-primary"
          disabled={activeTab === 'download'}
          onClick={() => {
            const idx = CMA_TABS.findIndex(t => t.key === activeTab);
            if (idx < CMA_TABS.length - 1) setActiveTab(CMA_TABS[idx + 1].key);
          }}
        >
          {activeTab === 'preview' ? 'Proceed to Download 📥' : 'Next Step →'}
        </button>
      </div>

      {/* Assistance Card */}
      <div className="cma-assist-card">
        <div className="cma-assist-icon">🎧</div>
        <div className="cma-assist-title">Need Assistance for your report</div>
        <button className="cma-assist-btn">Contact Us</button>
      </div>
    </div>
  );
}

// ============================================================
// HOME TAB (Simplified Dashboard)
// ============================================================
function HomeTab({ report }: { report: any }) {
  return (
    <div className="cma-form-card fade-in">
      <h2 className="cma-section-title">Report Dashboard</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
        <div className="card" style={{padding:24,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:12,color:'#64748b',textTransform:'uppercase',fontWeight:600}}>Project</div>
          <div style={{fontSize:18,fontWeight:700,marginTop:8}}>{report.title}</div>
        </div>
        <div className="card" style={{padding:24,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:12,color:'#64748b',textTransform:'uppercase',fontWeight:600}}>Client</div>
          <div style={{fontSize:18,fontWeight:700,marginTop:8}}>{report.client?.name}</div>
        </div>
        <div className="card" style={{padding:24,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:12,color:'#64748b',textTransform:'uppercase',fontWeight:600}}>Status</div>
          <div style={{fontSize:18,fontWeight:700,marginTop:8,color:'#7c3aed'}}>{report.status}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPANY DETAILS TAB (Matching Screenshot)
// ============================================================
function CompanyDetailsTab({ report, onSave }: { report: any; onSave: (d: any) => void }) {
  const client = report.client || {};
  return (
    <div className="cma-form-card fade-in">
      <h2 className="cma-section-title">Company details</h2>
      
      <div className="cma-form-group">
        <div className="cma-label">Company name *</div>
        <div className="cma-input-wrapper">
          <div className="cma-input-prefix">M/s</div>
          <input className="cma-input cma-input-prefixed" 
            defaultValue={client.businessName} 
            onBlur={e => onSave({ businessName: e.target.value })} 
            placeholder="Company Name" />
        </div>
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Address of the unit *</div>
        <textarea className="cma-textarea" 
          defaultValue={client.address}
          onBlur={e => onSave({ address: e.target.value })}
          placeholder="Complete Address" />
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Your Location *</div>
        <div className="cma-button-toggle">
          <button className={`cma-toggle-item ${client.cityType === 'RURAL' ? 'active' : ''}`}
            onClick={() => onSave({ cityType: 'RURAL' })}>Panchayath/Village</button>
          <button className={`cma-toggle-item ${client.cityType === 'URBAN' ? 'active' : ''}`}
            onClick={() => onSave({ cityType: 'URBAN' })}>Town, Municipality, Corporation</button>
        </div>
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Your activity *</div>
        <div style={{width:'100%'}}>
          <input className="cma-input" 
            defaultValue={client.businessActivity}
            onBlur={e => onSave({ businessActivity: e.target.value })}
            placeholder="Stitching unit, Dairy farm, etc." />
          <div style={{fontSize:12,color:'#64748b',marginTop:6}}>Like Dairy farm, Stiching unit etc</div>
        </div>
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Email</div>
        <input className="cma-input" 
          defaultValue={client.email}
          onBlur={e => onSave({ email: e.target.value })}
          placeholder="email@example.com" />
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Phone Number *</div>
        <input className="cma-input" 
          defaultValue={client.mobile}
          onBlur={e => onSave({ mobile: e.target.value })}
          placeholder="Phone Number" />
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Number of employment</div>
        <input className="cma-input" type="number"
          defaultValue={client.employeeCount}
          onBlur={e => onSave({ employeeCount: parseInt(e.target.value) })}
          placeholder="Total Employees" />
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Firm Registration type *</div>
        <select className="cma-input"
          defaultValue={client.constitution}
          onChange={e => onSave({ constitution: e.target.value })}>
          <option value="Proprietorship">Proprietorship</option>
          <option value="Partnership">Partnership</option>
          <option value="Private Limited">Private Limited</option>
          <option value="LLP">LLP</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
  );
}
