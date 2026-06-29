import React from 'react';
import { Group, SegmentedControl, TextInput } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';

export type StaffFilter = 'all' | 'active' | 'pending' | 'inactive';

interface Props {
  search:   string;
  onSearch: (v: string) => void;
  filter:   StaffFilter;
  onFilter: (v: StaffFilter) => void;
  total:    number;
  active:   number;
  pending:  number;
  inactive: number;
}

const SearchIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const StaffFilterBar: React.FC<Props> = (props) => {
  const data = [
    { value: 'all',      label: `${t(KEYS.staff.filter.all)} (${props.total})` },
    { value: 'active',   label: `${t(KEYS.staff.filter.active)} (${props.active})` },
    { value: 'pending',  label: `${t(KEYS.staff.filter.pending)} (${props.pending})` },
    { value: 'inactive', label: `${t(KEYS.staff.filter.inactive)} (${props.inactive})` },
  ];

  return (
    <Group justify="space-between" mb="md" wrap="nowrap">
      <TextInput
        leftSection={<SearchIcon />}
        placeholder={t(KEYS.staff.search)}
        value={props.search}
        onChange={(e) => props.onSearch(e.currentTarget.value)}
        style={{ flex: 1, maxWidth: 320 }}
      />
      <SegmentedControl
        value={props.filter}
        onChange={(v) => props.onFilter(v as StaffFilter)}
        data={data}
      />
    </Group>
  );
};

export default StaffFilterBar;
