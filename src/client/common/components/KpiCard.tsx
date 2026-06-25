import React from 'react';
import { Group } from '@mantine/core';

interface Props {
  label:    string;
  icon:     React.ReactNode;
  subtext:  string;
  delay:    string;
  active:   boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const KpiCard: React.FC<Props> = ({ label, icon, subtext, delay, active, onClick, children }) => (
  <div
    className={`kpi reveal${active ? ' in' : ''}`}
    style={{ transitionDelay: delay, cursor: onClick ? 'pointer' : undefined }}
    onClick={onClick}
  >
    <Group gap={8} mb={10}>
      <span className="icon-badge">{icon}</span>
      <span className="label-text">{label}</span>
    </Group>
    {children}
    <p className="kpi-trend">{subtext}</p>
  </div>
);

export default KpiCard;
