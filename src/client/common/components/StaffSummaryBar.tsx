import React from 'react';
import { Group, Paper, Skeleton, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';

interface Props {
  total:    number;
  active:   number;
  pending:  number;
  inactive: number;
  loading:  boolean;
}

const IconAllStaff: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconActiveStaff: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
);

const IconPendingStaff: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <circle cx="19" cy="19" r="3"/>
    <line x1="19" y1="17" x2="19" y2="19"/>
    <line x1="19" y1="21" x2="19.01" y2="21"/>
  </svg>
);

const IconInactiveStaff: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="17" y1="11" x2="23" y2="17"/>
    <line x1="23" y1="11" x2="17" y2="17"/>
  </svg>
);

const STATS = [
  { icon: <IconAllStaff />,      color: 'blue',   labelKey: KEYS.staff.stat.total,    getValue: (p: Props) => p.total },
  { icon: <IconActiveStaff />,   color: 'green',  labelKey: KEYS.staff.stat.active,   getValue: (p: Props) => p.active },
  { icon: <IconPendingStaff />,  color: 'orange', labelKey: KEYS.staff.stat.pending,  getValue: (p: Props) => p.pending },
  { icon: <IconInactiveStaff />, color: 'gray',   labelKey: KEYS.staff.stat.inactive, getValue: (p: Props) => p.inactive },
] as const;

const StaffSummaryBar: React.FC<Props> = (props) => (
  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
    {STATS.map(({ icon, color, labelKey, getValue }) => (
      <Paper key={labelKey} p="md" radius="md" withBorder>
        <Group gap="md" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color={color} variant="light">
            {icon}
          </ThemeIcon>
          <Stack gap={0}>
            {props.loading
              ? <Skeleton height={22} width={44} mb={4} radius="sm" />
              : <Text fw={700} size="xl" lh={1}>{getValue(props)}</Text>
            }
            <Text size="sm" c="dimmed">{t(labelKey)}</Text>
          </Stack>
        </Group>
      </Paper>
    ))}
  </SimpleGrid>
);

export default StaffSummaryBar;
