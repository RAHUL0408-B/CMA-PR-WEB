import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const LOAN_TYPES = ['Term Loan','Working Capital','CC Limit','OD Limit','Mudra Loan','Machinery Loan','MSME Loan','Startup Loan','Vehicle Loan','LAP','Home Loan'];

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', reportType: 'CMA', loanType: '', loanAmount: '' });

  useEffect(() => {
    if (!id) return;
    api.clients.get(id).then(setClient).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const createReport = async () => {
    if (!newReport.title) { alert('Please enter a report title'); return; }
    setCreating(true);
    try {
      const r = await api.reports.create({ ...newReport, clientId: id, userId: user?.uid });
      navigate(`/reports/${r.id}`);
    } catch (err: any) { alert(err.message); setCreating(false); }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}><div className="spinner spinner-dark" style={{width:28,height:28}} /></div>;
  if (!client) return <div className="alert alert-error">Client not found</div>;

  const statusBadge = (s: string) => {
    const map: Record<string,string> = {DRAFT:'badge-gray',IN_PROGRESS:'badge-amber',COMPLETED:'badge-green',EXPORTED:'badge-purple'};
    return <span className={`badge ${map[s]||'badge-gray'}`}>{s}</span>;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
            <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }}>← Clients</button>
          </div>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-subtitle">{client.businessName || 'No business name'} · {client.constitution || 'No constitution'}</p>
        </div>
        <div className="page-actions">
          <span className="badge badge-blue">{client.reports?.length || 0} Reports</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        {/* Left: Client Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KYC */}
          <div className="card">
            <div className="card-header"><div className="card-title">KYC Details</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['PAN', client.pan], ['Aadhaar', client.aadhaar ? '****' + client.aadhaar.slice(-4) : null],
                ['GST', client.gst], ['Mobile', client.mobile], ['Email', client.email],
                ['Udyam', client.udyamNumber], ['CIN', client.cinNumber]
              ].filter(([,v]) => v).map(([k,v]) => (
                <div key={k as string} style={{ display:'flex', justifyContent:'space-between', fontSize: 13 }}>
                  <span style={{ color:'var(--text-muted)', fontWeight:500 }}>{k as string}</span>
                  <span style={{ fontFamily:'monospace', fontWeight: 600 }}>{v as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Business Info */}
          <div className="card">
            <div className="card-header"><div className="card-title">Business Info</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Business', client.businessName], ['Industry', client.industryType],
                ['Constitution', client.constitution], ['Promoter', client.promoterName],
                ['Experience', client.promoterExperience ? `${client.promoterExperience} years` : null],
                ['Existing Bank', client.existingBanker], ['City', client.city], ['State', client.state]
              ].filter(([,v]) => v).map(([k,v]) => (
                <div key={k as string} style={{ display:'flex', justifyContent:'space-between', fontSize: 13 }}>
                  <span style={{ color:'var(--text-muted)', fontWeight:500 }}>{k as string}</span>
                  <span style={{ fontWeight: 500, textAlign:'right', maxWidth: 180, wordBreak:'break-word' }}>{v as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Report */}
          <div className="card">
            <div className="card-header"><div className="card-title">Create New Report</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label required">Report Title</label>
                <input className="form-input" placeholder="e.g., CMA Report FY 2024-25"
                  value={newReport.title} onChange={e => setNewReport(r => ({...r, title: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Report Type</label>
                <select className="form-select" value={newReport.reportType} onChange={e => setNewReport(r => ({...r, reportType: e.target.value}))}>
                  {['CMA','PROJECT_REPORT','BANK_LOAN','DSCR','EMI','RATIO_ANALYSIS','WORKING_CAPITAL','LOAN_ELIGIBILITY'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Loan Type</label>
                <select className="form-select" value={newReport.loanType} onChange={e => setNewReport(r => ({...r, loanType: e.target.value}))}>
                  <option value="">Select loan type</option>
                  {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Loan Amount (₹ Lakhs)</label>
                <input type="number" className="form-input" placeholder="e.g., 50"
                  value={newReport.loanAmount} onChange={e => setNewReport(r => ({...r, loanAmount: e.target.value}))} />
              </div>
              <button className="btn btn-primary w-full" onClick={createReport} disabled={creating}>
                {creating ? <><span className="spinner" />Creating...</> : '+ Create Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Reports */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Reports</div>
                <div className="card-subtitle">{client.reports?.length || 0} reports for this client</div>
              </div>
            </div>
            {!client.reports?.length ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No reports yet</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Create your first report using the form on the left</div>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Report Title</th>
                      <th>Type</th>
                      <th>Loan Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.reports.map((r: any) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.title}</td>
                        <td><span className="badge badge-blue" style={{fontSize:10}}>{r.reportType}</span></td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {r.loanAmount ? `₹${r.loanAmount.toLocaleString('en-IN')} L` : '—'}
                        </td>
                        <td>{statusBadge(r.status)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/reports/${r.id}`)}>
                            Open →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
