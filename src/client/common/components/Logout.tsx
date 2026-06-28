import React from 'react';
import { useAuth } from '@client/common/context/AuthContext';
import { showConfirm } from '@client/common/utils/swal';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

const Logout: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    const result = await showConfirm(
      t(KEYS.nav.logoutConfirmTitle),
      t(KEYS.nav.logoutConfirmText),
    );
    if (result.isConfirmed) logout();
  };

  return (
    <button className="navitem" title={t(KEYS.nav.logout)} onClick={handleLogout}>
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
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span className="nav-label">{t(KEYS.nav.logout)}</span>
    </button>
  );
};

export default Logout;
