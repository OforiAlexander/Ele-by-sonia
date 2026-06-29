import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import BrandLogo from '@client/common/assets/BrandLogo';
import Logout from './Logout';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';
import { useAuth } from '../context/AuthContext';
import type { CurrentUser } from '../types';

type NavPermission = (user: CurrentUser) => boolean;

interface NavItem {
  key:        string;
  label:      string;
  to:         string;
  allowed:    NavPermission;
}

const always: NavPermission = () => true;
const ownerOrPerm =
  (flag: keyof CurrentUser): NavPermission =>
  (u) => !!u.is_owner || !!(u as any)[flag];

const NAV: NavItem[] = [
  { key: 'dashboard',   label: t(KEYS.nav.dashboard),   to: '/',              allowed: always },
  { key: 'inventory',   label: t(KEYS.nav.inventory),   to: '/products',      allowed: ownerOrPerm('can_view_products') },
  { key: 'categories',  label: t(KEYS.nav.categories),  to: '/categories',    allowed: ownerOrPerm('can_view_categories') },
  { key: 'sales',       label: t(KEYS.nav.sales),       to: '/pos',           allowed: ownerOrPerm('can_process_sales') },
  { key: 'salesHistory', label: t(KEYS.nav.salesHistory), to: '/sales',       allowed: ownerOrPerm('can_view_sales') },
  { key: 'transactions', label: t(KEYS.nav.transactions), to: '/transactions', allowed: ownerOrPerm('can_view_sales') },
  { key: 'orders',      label: t(KEYS.nav.orders),      to: '/orders',        allowed: (u) => !!u.is_owner },
  { key: 'reports',     label: t(KEYS.nav.reports),     to: '/reports',       allowed: ownerOrPerm('can_view_reports') },
  { key: 'staff',       label: t(KEYS.nav.staff),       to: '/staff',         allowed: ownerOrPerm('can_view_staff') },
  { key: 'settings',    label: t(KEYS.nav.settings),    to: '/settings',      allowed: ownerOrPerm('can_view_settings') },
];

const ICONS: Record<string, React.ReactNode> = {
  dashboard:  <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  inventory:  <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  categories: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  sales:       <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
  salesHistory: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
  transactions: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  orders:      <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="11" y2="16"/></>,
  reports:     <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  staff:       <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
};

const NavIcon: React.FC<{ iconKey: string }> = ({ iconKey }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {ICONS[iconKey]}
  </svg>
);

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const visibleNav = user ? NAV.filter((item) => item.allowed(user)) : [];

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div className="sidebar-logo-inner">
            <BrandLogo variant="dark" size="sm" />
          </div>
        )}
        {!collapsed ? (
          <button
            className="sidebar-toggle-btn"
            title="Collapse sidebar"
            onClick={() => setCollapsed(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <button
            className="sidebar-expand-btn"
            title="Expand sidebar"
            onClick={() => setCollapsed(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {visibleNav.map(({ key, label, to }) => (
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
        <Logout />
      </div>
    </aside>
  );
};

export default Sidebar;
