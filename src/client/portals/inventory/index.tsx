import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import {
  BrowserRouter, Routes, Route, NavLink, Outlet, Navigate,
} from 'react-router-dom';
import '@mantine/core/styles.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/space-grotesk/700.css';
import '../../common/styles/portal.scss';
import { AuthProvider, useAuth } from '../../common/context/AuthContext';
import { t } from '../../common/translations';
import { KEYS } from '../../common/keys';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import PosPage from './pages/PosPage';
import ReportsPage from './pages/ReportsPage';
import StaffPage from './pages/StaffPage';
import SettingsPage from './pages/SettingsPage';
import DeliveryZonesPage from './pages/DeliveryZonesPage';
import RolesPage from './pages/RolesPage';
import VariantsPage from './pages/VariantsPage';

const theme = {
  primaryColor: 'green' as const,
  colors: {
    green: [
      '#e8f8ef', '#c5edda', '#9fe0c3', '#74d3ac',
      '#50C878', '#3db366', '#2d9e52', '#1e8a3e',
      '#0f762b', '#006219',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  fontFamily: 'IBM Plex Sans, sans-serif',
};

const NAV = [
  { key: 'dashboard', label: t(KEYS.nav.dashboard), to: '/' },
  { key: 'inventory',  label: t(KEYS.nav.inventory),  to: '/products' },
  { key: 'sales',      label: t(KEYS.nav.sales),      to: '/pos' },
  { key: 'orders',     label: t(KEYS.nav.orders),     to: '/orders' },
  { key: 'reports',    label: t(KEYS.nav.reports),    to: '/reports' },
  { key: 'staff',      label: t(KEYS.nav.staff),      to: '/staff' },
  { key: 'settings',   label: t(KEYS.nav.settings),   to: '/settings' },
];

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  inventory: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  sales:     <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
  orders:    <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="11" y2="16"/></>,
  reports:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  staff:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
};

const NavIcon: React.FC<{ iconKey: string }> = ({ iconKey }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {ICONS[iconKey]}
  </svg>
);

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const Layout: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  if (loading) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span className="label-text">{t(KEYS.common.loading)}</span>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/account/';
    return null;
  }

  const initials = getInitials(user.name);
  const roleName = user.role?.name ?? (user.is_owner ? 'Owner' : 'Staff');

  return (
    <div className="app">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
          <div className="sidebar-logo-inner">
            <div className="sidebar-logo-badge">V</div>
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-name">ELEGANCE</div>
              <div className="sidebar-logo-sub">BY SCONIA</div>
            </div>
          </div>
          {!collapsed && (
            <button className="sidebar-toggle-btn" title="Collapse sidebar" onClick={() => setCollapsed(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>

        {collapsed && (
          <button className="sidebar-expand-btn" title="Expand sidebar" onClick={() => setCollapsed(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        <nav className="sidebar-nav">
          {NAV.map(({ key, label, to }) => (
            <NavLink
              key={key}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `navitem${isActive ? ' active' : ''}`}
            >
              <NavIcon iconKey={key} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <button className="navitem" title={collapsed ? t(KEYS.nav.logout) : undefined} onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="nav-label">{t(KEYS.nav.logout)}</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-search">
            <span className="topbar-search-icon" />
            <input className="topbar-search-input" placeholder="Search products or SKUs…" />
          </div>

          <div className="topbar-right">
            <div className="topbar-notif">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6B63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="topbar-notif-dot" />
            </div>

            <div className="topbar-divider" />

            <div className="topbar-user">
              <div className="topbar-avatar">{initials}</div>
              <div className="topbar-user-info">
                <div className="topbar-user-name">{user.name}</div>
                <div className="topbar-user-role">{roleName}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <MantineProvider theme={theme}>
    <AuthProvider>
      <BrowserRouter basename="/inventory">
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="delivery" element={<DeliveryZonesPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="variants" element={<VariantsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </MantineProvider>
);

const container = document.getElementById('root')!;
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
