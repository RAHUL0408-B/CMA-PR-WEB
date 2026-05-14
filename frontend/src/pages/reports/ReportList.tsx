import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ReportList() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports.list().then(setReports).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r =>
    [r.title, r.client?.name, r.reportType, r.status].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const statusBadge = (s: string) => {
    const map: Record<string,string> = {DRAFT:'badge-gray',IN_PROGRESS:'badge-amber',REVIEW:'badge-blue',COMPLETED:'badge-green',EXPORTED:'badge-purple'};
    return <span className={`badge ${map[s]||'badge-gray'}`}>{s}</span>;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">{reports.length} total reports</p>
        </div>
        <div className="page-actions">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>
            <input className="search-input" placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Link to="/clients" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
            New Report
          </Link>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{padding:40,textAlign:'center'}}><div className="spinner spinner-dark" style={{width:28,height:28,margin:'0 auto'}} /></div>
        ) : filtered.length === 0 ? (
          <div style={{padding:'60px 20px',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>{search ? 'No reports found' : 'No reports yet'}</div>
            <div style={{color:'var(--text-muted)',marginBottom:20}}>
              {search ? 'Try a different search term' : 'Create a client first and then generate a report'}
            </div>
            {!search && <Link to="/clients/new" className="btn btn-primary">Add First Client</Link>}
          </div>
        ) : (
          <div className="table-wrapper" style={{border:'none'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report</th><th>Client</th><th>Type</th><th>Loan Amount</th><th>Status</th><th>Updated</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{cursor:'pointer'}} onClick={() => navigate(`/reports/${r.id}`)}>
                    <td style={{fontWeight:600}}>{r.title}</td>
                    <td>
                      <div>{r.client?.name}</div>
                      {r.client?.businessName && <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.client.businessName}</div>}
                    </td>
                    <td><span className="badge badge-blue" style={{fontSize:10}}>{r.reportType?.replace(/_/g,' ')}</span></td>
                    <td style={{fontFamily:'monospace'}}>
                      {r.loanAmount ? `₹${Number(r.loanAmount).toLocaleString('en-IN')} L` : '—'}
                    </td>
                    <td>{statusBadge(r.status)}</td>
                    <td style={{fontSize:12,color:'var(--text-muted)'}}>
                      {new Date(r.updatedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td><span className="btn btn-primary btn-sm">Open →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
