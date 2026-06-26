import React from 'react';
import { Table, Skeleton, Stack } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';
import { StaffMember } from '../types';
import StaffActionMenu from './StaffActionMenu';


interface Props {
  staff:          StaffMember[];
  loading:        boolean;
  canUpdate:      boolean;
  canDeactivate:  boolean;
  onEdit:         (s: StaffMember) => void;
  onToggleStatus: (s: StaffMember) => void;
}

const StaffTable: React.FC<Props> = ({ staff, loading, canUpdate, canDeactivate, onEdit, onToggleStatus }) => {
  if (loading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={52} radius="sm" />
        ))}
      </Stack>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="staff-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C8D5CF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p className="staff-empty-text">{t(KEYS.staff.table.empty)}</p>
      </div>
    );
  }

  return (
    <Table highlightOnHover verticalSpacing="md" horizontalSpacing="md">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t(KEYS.staff.table.name)}</Table.Th>
          <Table.Th>{t(KEYS.staff.table.phone)}</Table.Th>
          <Table.Th>{t(KEYS.staff.table.role)}</Table.Th>
          <Table.Th>{t(KEYS.staff.table.status)}</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {staff.map((s) => (
          <Table.Tr key={s.id} className={s.is_active ? '' : 'staff-row--inactive'}>
            <Table.Td>
              <div className="staff-name-cell">
                <span className="staff-name-text">{s.name}</span>
                <div className="staff-email-text">{s.email}</div>
              </div>
            </Table.Td>
            <Table.Td>
              <span className={s.phone ? 'staff-phone-text' : 'staff-muted-text'}>
                {s.phone ?? t(KEYS.common.noData)}
              </span>
            </Table.Td>
            <Table.Td>
              {s.role
                ? <span className="staff-role-badge">{s.role.name}</span>
                : <span className="staff-muted-text">{t(KEYS.staff.table.noRole)}</span>
              }
            </Table.Td>
            <Table.Td>
              <div className="staff-status-cell">
                <span className={`staff-status-dot staff-status-dot--${s.is_active ? 'active' : 'inactive'}`} />
                <span className="staff-status-text">
                  {s.is_active ? t(KEYS.staff.status.active) : t(KEYS.staff.status.inactive)}
                </span>
              </div>
            </Table.Td>
            <Table.Td>
              {(canUpdate || canDeactivate) && (
                <StaffActionMenu
                  staff={s}
                  canUpdate={canUpdate}
                  canDeactivate={canDeactivate}
                  onEdit={() => onEdit(s)}
                  onToggleStatus={() => onToggleStatus(s)}
                />
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

export default StaffTable;
