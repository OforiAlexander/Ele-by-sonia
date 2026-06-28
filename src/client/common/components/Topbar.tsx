import React from 'react';
import { useAuth } from '@client/common/context/AuthContext';
import Notification from './Notification';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const Topbar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const initials = getInitials(user.name);
  const roleName = user.role?.name ?? (user.is_owner ? 'Owner' : 'Staff');

  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-icon" />
        <input className="topbar-search-input" placeholder="Search products or SKUs…" />
      </div>

      <div className="topbar-right">
        <Notification />
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
  );
};

export default Topbar;
