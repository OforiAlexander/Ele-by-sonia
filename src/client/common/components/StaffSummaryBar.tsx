import React from 'react';
import { Skeleton } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';

interface Props {
  total:    number;
  active:   number;
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

const IconInactiveStaff: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="17" y1="11" x2="23" y2="17"/>
    <line x1="23" y1="11" x2="17" y2="17"/>
  </svg>
);

const STATS = [
  { icon: <IconAllStaff />,      modifier: '--all',      labelKey: KEYS.staff.stat.total,    getValue: (p: Props) => p.total },
  { icon: <IconActiveStaff />,   modifier: '--active',   labelKey: KEYS.staff.stat.active,   getValue: (p: Props) => p.active },
  { icon: <IconInactiveStaff />, modifier: '--inactive', labelKey: KEYS.staff.stat.inactive, getValue: (p: Props) => p.inactive },
] as const;

const StaffSummaryBar: React.FC<Props> = (props) => (
  <div className="staff-summary-bar">
    {STATS.map(({ icon, modifier, labelKey, getValue }) => (
      <div key={modifier} className="staff-stat">
        <div className={`staff-stat-icon staff-stat-icon${modifier}`}>{icon}</div>
        <div>
          {props.loading
            ? <Skeleton height={22} width={44} mb={4} radius="sm" />
            : <div className="staff-stat-value">{getValue(props)}</div>
          }
          <div className="staff-stat-label">{t(labelKey)}</div>
        </div>
      </div>
    ))}
  </div>
);

export default StaffSummaryBar;
