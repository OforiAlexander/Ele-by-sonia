import React from 'react';
import { Badge } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';

interface Props {
  isActive: boolean;
}

const StaffStatusBadge: React.FC<Props> = ({ isActive }) => (
  <Badge size="sm" radius="sm" color={isActive ? 'green' : 'gray'} variant="light">
    {isActive ? t(KEYS.staff.status.active) : t(KEYS.staff.status.inactive)}
  </Badge>
);

export default StaffStatusBadge;
