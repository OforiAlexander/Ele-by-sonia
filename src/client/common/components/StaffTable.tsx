import React from 'react';
import { Badge, Group, Skeleton, Stack, Table, Text } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';
import { StaffMember } from '../types';
import StaffActionMenu from './StaffActionMenu';
import StaffStatusBadge from './StaffStatusBadge';

interface Props {
  staff:            StaffMember[];
  loading:          boolean;
  canUpdate:        boolean;
  canDeactivate:    boolean;
  canCreate:        boolean;
  onEdit:           (s: StaffMember) => void;
  onToggleStatus:   (s: StaffMember) => void;
  onResendInvite:   (s: StaffMember) => void;
  onCancelInvite:   (s: StaffMember) => void;
}

const StaffTable: React.FC<Props> = ({
  staff, loading, canUpdate, canDeactivate, canCreate,
  onEdit, onToggleStatus, onResendInvite, onCancelInvite,
}) => {
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
              <Stack gap={2}>
                <Text fw={500} size="sm">{s.name}</Text>
                <Text size="xs" c="dimmed">{s.email}</Text>
              </Stack>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c={s.phone ? undefined : 'dimmed'}>
                {s.phone ?? t(KEYS.common.noData)}
              </Text>
            </Table.Td>
            <Table.Td>
              {s.role
                ? <Badge size="sm" radius="sm" variant="light" color="violet">{s.role.name}</Badge>
                : <Text size="sm" c="dimmed">{t(KEYS.staff.table.noRole)}</Text>
              }
            </Table.Td>
            <Table.Td>
              {s.must_change_password
                ? <Text size="sm" c="dimmed">{t(KEYS.staff.status.pending)}</Text>
                : <StaffStatusBadge isActive={s.is_active} />
              }
            </Table.Td>
            <Table.Td>
              {(canUpdate || canDeactivate || canCreate) && (
                <StaffActionMenu
                  staff={s}
                  canUpdate={canUpdate}
                  canDeactivate={canDeactivate}
                  canCreate={canCreate}
                  onEdit={() => onEdit(s)}
                  onToggleStatus={() => onToggleStatus(s)}
                  onResendInvite={() => onResendInvite(s)}
                  onCancelInvite={() => onCancelInvite(s)}
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
