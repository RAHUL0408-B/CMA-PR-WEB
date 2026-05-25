import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Stats { clients: number; reports: number; drafts: number; completed: number }

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ clients: 0, reports: 0, drafts: 0, completed: 0 });
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.clients.list(user?.uid), api.reports.list(undefined, user?.uid)])
      .then(([clients, reports]) => {
        setStats({
          clients: clients.length,
          reports: reports.length,
          drafts: reports.filter((r: any) => r.status === 'DRAFT').length,
          completed: reports.filter((r: any) => r.status === 'COMPLETED').length
        });
        setRecentClients(clients.slice(0, 5));
        setRecentReports(reports.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const statCards = [
    { label: 'Total Clients', value: stats.clients, color: '', icon: '👥', sub: 'Active clients' },
    { label: 'Total Reports', value: stats.reports, color: 'green', icon: '📋', sub: 'All reports' },
    { label: 'Drafts', value: stats.drafts, color: 'amber', icon: '✏️', sub: 'Pending action' },
    { label: 'Completed', value: stats.completed, color: 'purple', icon: '✅', sub: 'Ready to export' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { DRAFT: 'badge-gray', IN_PROGRESS: 'badge-amber', REVIEW: 'badge-blue', COMPLETED: 'badge-green', EXPORTED: 'badge-purple' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: 300 }}>
      <div className="spinner spinner-dark" style={{width: 28, height: 28}} />
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your financial underwriting activity</p>
        </div>
        <div className="page-actions">
          <Link to="/clients/new" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
            New Client
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Quick Actions</div>
            <div className="card-subtitle">Generate reports faster</div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'CMA Report', color: '#2563EB', icon: '📊' },
              { label: 'Project Report', color: '#10B981', icon: '📝' },
              { label: 'Loan Eligibility', color: '#8B5CF6', icon: '🏦' },
              { label: 'EMI Schedule', color: '#F59E0B', icon: '💰' },
              { label: 'Ratio Analysis', color: '#EF4444', icon: '📈' },
              { label: 'DSCR Report', color: '#0EA5E9', icon: '📉' },
            ].map(q => (
              <button key={q.label} className="btn btn-secondary"
                style={{ flexDirection: 'column', gap: 6, padding: '14px 12px', height: 'auto', borderColor: 'var(--border)' }}
                onClick={() => navigate('/clients/new')}>
                <span style={{ fontSize: 22 }}>{q.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Clients */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Clients</div>
            <Link to="/clients" style={{ fontSize: 12, color: 'var(--primary)' }}>View all →</Link>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            {recentClients.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No clients yet. <Link to="/clients/new" style={{ color: 'var(--primary)' }}>Add your first client</Link>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Name</th><th>PAN</th><th>Handled By</th><th>Reports</th></tr></thead>
                <tbody>
                  {recentClients.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clients/${c.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.businessName || c.industryType || '—'}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.pan || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{c.user?.displayName || c.user?.name || 'Local Dev'}</div>
                      </td>
                      <td><span className="badge badge-blue">{c._count?.reports || 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Reports</div>
            <Link to="/reports" style={{ fontSize: 12, color: 'var(--primary)' }}>View all →</Link>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            {recentReports.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No reports yet.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Title</th><th>Type</th><th>Handled By</th><th>Status</th></tr></thead>
                <tbody>
                  {recentReports.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/reports/${r.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.client?.name}</div>
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{r.reportType}</span></td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{r.user?.displayName || r.user?.name || 'Local Dev'}</div>
                      </td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
