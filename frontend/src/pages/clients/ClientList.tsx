import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = () => {
    setLoading(true);
    api.clients.list().then(setClients).catch(console.error).finally(() => setLoading(false));
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? All their reports will also be deleted.`)) return;
    setDeleting(id);
    try { await api.clients.delete(id); setClients(c => c.filter(x => x.id !== id)); }
    catch (err: any) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const filtered = clients.filter(c =>
    [c.name, c.businessName, c.pan, c.mobile, c.email, c.industryType].some(
      v => v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Management</h1>
          <p className="page-subtitle">{clients.length} clients registered</p>
        </div>
        <div className="page-actions">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>
            <input className="search-input" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Link to="/clients/new" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
            Add Client
          </Link>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner spinner-dark" style={{width:28, height:28, margin:'0 auto'}} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {search ? 'No clients found' : 'No clients yet'}
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              {search ? 'Try a different search term' : 'Add your first client to start generating reports'}
            </div>
            {!search && <Link to="/clients/new" className="btn btn-primary">Add First Client</Link>}
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Business</th>
                  <th>Contact</th>
                  <th>PAN / GST</th>
                  <th>Industry</th>
                  <th>Reports</th>
                  <th>Added</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => (
                  <tr key={client.id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => navigate(`/clients/${client.id}`)}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{client.name}</div>
                      {client.businessName && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{client.businessName}</div>
                      )}
                      {client.constitution && (
                        <span className="badge badge-gray" style={{ marginTop: 4, fontSize: 10 }}>{client.constitution}</span>
                      )}
                    </td>
                    <td onClick={() => navigate(`/clients/${client.id}`)}>
                      <div>{client.mobile || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{client.email || ''}</div>
                    </td>
                    <td onClick={() => navigate(`/clients/${client.id}`)}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{client.pan || '—'}</div>
                      {client.gst && <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>{client.gst}</div>}
                    </td>
                    <td onClick={() => navigate(`/clients/${client.id}`)}>
                      {client.industryType ? (
                        <span className="badge badge-blue">{client.industryType}</span>
                      ) : '—'}
                    </td>
                    <td onClick={() => navigate(`/clients/${client.id}`)}>
                      <span className="badge badge-purple">{client._count?.reports || 0} reports</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }} onClick={() => navigate(`/clients/${client.id}`)}>
                      {new Date(client.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/clients/${client.id}`)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm"
                          disabled={deleting === client.id}
                          onClick={() => handleDelete(client.id, client.name)}>
                          {deleting === client.id ? <span className="spinner" style={{width:12,height:12}} /> : 'Del'}
                        </button>
                      </div>
                    </td>
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
