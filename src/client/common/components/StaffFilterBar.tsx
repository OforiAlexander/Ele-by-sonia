import React from 'react';
import { TextInput } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';

export type StaffFilter = 'all' | 'active' | 'inactive';

interface Props {
  search:   string;
  onSearch: (v: string) => void;
  filter:   StaffFilter;
  onFilter: (v: StaffFilter) => void;
  total:    number;
  active:   number;
  inactive: number;
}

const SearchIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const FILTERS: { value: StaffFilter; labelKey: string; getCount: (p: Props) => number }[] = [
  { value: 'all',      labelKey: KEYS.staff.filter.all,      getCount: (p) => p.total },
  { value: 'active',   labelKey: KEYS.staff.filter.active,   getCount: (p) => p.active },
  { value: 'inactive', labelKey: KEYS.staff.filter.inactive, getCount: (p) => p.inactive },
];

const StaffFilterBar: React.FC<Props> = (props) => (
  <div className="staff-filter-bar">
    <div className="staff-filter-left">
      <TextInput
        leftSection={<SearchIcon />}
        placeholder={t(KEYS.staff.search)}
        value={props.search}
        onChange={(e) => props.onSearch(e.currentTarget.value)}
      />
    </div>
    <div className="seg">
      {FILTERS.map(({ value, labelKey, getCount }) => (
        <div
          key={value}
          className={`segbtn${props.filter === value ? ' active' : ''}`}
          onClick={() => props.onFilter(value)}
        >
          {t(labelKey)}
          <span className="staff-filter-count">{getCount(props)}</span>
        </div>
      ))}
    </div>
  </div>
);

export default StaffFilterBar;
