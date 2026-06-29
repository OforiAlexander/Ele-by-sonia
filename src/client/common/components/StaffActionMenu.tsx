import React from 'react';
import { ActionIcon, Menu } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';
import { StaffMember } from '../types';

interface Props {
  staff:          StaffMember;
  canUpdate:      boolean;
  canDeactivate:  boolean;
  canCreate:      boolean;
  onEdit:         () => void;
  onToggleStatus: () => void;
  onResendInvite: () => void;
  onCancelInvite: () => void;
}

const IconDots: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5"  cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const IconEdit: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconSend: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconXCircle: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconUserOff: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="17" y1="11" x2="23" y2="17" />
    <line x1="23" y1="11" x2="17" y2="17" />
  </svg>
);

const IconUserCheck: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);

const StaffActionMenu: React.FC<Props> = ({
  staff, canUpdate, canDeactivate, canCreate,
  onEdit, onToggleStatus, onResendInvite, onCancelInvite,
}) => (
  <Menu position="bottom-end" withinPortal>
    <Menu.Target>
      <ActionIcon variant="subtle" color="gray" aria-label="Actions">
        <IconDots />
      </ActionIcon>
    </Menu.Target>
    <Menu.Dropdown>
      {canUpdate && (
        <Menu.Item leftSection={<IconEdit />} onClick={onEdit}>
          {t(KEYS.staff.edit)}
        </Menu.Item>
      )}

      {staff.must_change_password ? (
        <>
          {canCreate && (
            <Menu.Item leftSection={<IconSend />} onClick={onResendInvite}>
              {t(KEYS.staff.resendInvite)}
            </Menu.Item>
          )}
          {canDeactivate && (
            <Menu.Item leftSection={<IconXCircle />} color="red" onClick={onCancelInvite}>
              {t(KEYS.staff.cancelInvite)}
            </Menu.Item>
          )}
        </>
      ) : (
        canDeactivate && (
          <Menu.Item
            leftSection={staff.is_active ? <IconUserOff /> : <IconUserCheck />}
            color={staff.is_active ? 'red' : 'green'}
            onClick={onToggleStatus}
          >
            {staff.is_active ? t(KEYS.staff.deactivate) : t(KEYS.staff.reactivate)}
          </Menu.Item>
        )
      )}
    </Menu.Dropdown>
  </Menu>
);

export default StaffActionMenu;
