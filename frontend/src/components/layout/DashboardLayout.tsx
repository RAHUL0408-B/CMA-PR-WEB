import type { ReactElement } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Icon({ name }: { name: string }) {
  const icons: Record<string, ReactElement> = {
    dashboard: <svg className="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg>,
    clients: <svg className="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>,
    reports: <svg className="icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>,
    analytics: <svg className="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>,
    settings: <svg className="icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>,
  };
  return icons[name] || <svg className="icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="4"/></svg>;
}

const NAV = [
  { label: 'Dashboard', path: '/', iconKey: 'dashboard', section: 'MAIN' },
  { label: 'Clients', path: '/clients', iconKey: 'clients', section: 'MAIN' },
  { label: 'Reports', path: '/reports', iconKey: 'reports', section: 'MAIN' },
  { label: 'Settings', path: '/settings', iconKey: 'settings', section: 'TOOLS' },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Client Management',
  '/clients/new': 'New Client',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTitle = () => {
    const exact = PAGE_TITLES[location.pathname];
    if (exact) return exact;
    if (location.pathname.startsWith('/clients/') && !location.pathname.endsWith('/new')) return 'Client Details';
    if (location.pathname.startsWith('/reports/')) return 'Report Workspace';
    return 'CMA Pro AI';
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sections = [...new Set(NAV.map(n => n.section))];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="#2563EB"/>
              <path d="M4 18 L8 10 L12 14 L16 6 L20 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            CMA Pro
            <span className="logo-badge">AI</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
            Financial Underwriting Suite
          </div>
        </div>

        {sections.map(section => (
          <div className="nav-section" key={section}>
            <div className="nav-label">{section}</div>
            {NAV.filter(n => n.section === section).map(item => (
              <Link key={item.path} to={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
                <Icon name={item.iconKey} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0
            }}>
              {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.displayName || 'User'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button onClick={() => logout().then(() => navigate('/login'))}
            className="btn btn-ghost w-full"
            style={{ color: 'rgba(255,255,255,0.5)', justifyContent: 'flex-start', padding: '6px 8px' }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{getTitle()}</span>
          <div className="topbar-actions">
            <Link to="/clients/new" className="btn btn-primary btn-sm">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
              New Client
            </Link>
          </div>
        </header>
        <main className="page-content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
