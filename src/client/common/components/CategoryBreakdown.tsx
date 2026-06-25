import React, { useEffect, useState } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import api from '../api';
import AnimatedBar from './AnimatedBar';
import { t } from '../translations';
import { KEYS } from '../keys';
import { formatCurrency } from '../utils/formatCurrency';

const PERIOD_MAP = { '7D': 'weekly', '30D': 'monthly', '12M': 'annual' } as const;

interface Item { name: string; revenue: number; }

interface Props {
  initialCategories: Item[];
  range:             '7D' | '30D' | '12M';
  active:            boolean;
}

const CategoryBreakdown: React.FC<Props> = ({ initialCategories, range, active }) => {
  const [categories, setCategories] = useState<Item[]>(initialCategories);
  const maxRev = Math.max(...categories.map(c => c.revenue), 1);

  useEffect(() => {
    const period = PERIOD_MAP[range];
    api.get(`/reports/profit?period=${period}&groupBy=category`).catch(() => null).then((res) => {
      if (res?.data?.data) {
        setCategories((res.data.data as any[]).slice(0, 4).map((c: any) => ({ name: c.group, revenue: Number(c.revenue) })));
      }
    });
  }, [range]);

  return (
    <div className="card">
      <Text fw={600} c="#11231B" fz="sm" mb={18}>{t(KEYS.dashboard.categories.title)}</Text>
      <Stack gap={14}>
        {categories.length === 0 ? (
          <Text c="dimmed" fz="sm">{t(KEYS.dashboard.categories.empty)}</Text>
        ) : categories.map((item, i) => (
          <div key={item.name}>
            <Group justify="space-between" mb={6}>
              <Text fz="sm" fw={500} c="#3A4A42">{item.name}</Text>
              <Text fz="sm" c="#8A9890">{formatCurrency(item.revenue)}</Text>
            </Group>
            <AnimatedBar
              pct={`${Math.round((item.revenue / maxRev) * 100)}%`}
              color={i === 0 ? '#E3A92B' : '#0E7A52'}
              delay={`${0.45 + i * 0.08}s`}
              active={active}
            />
          </div>
        ))}
      </Stack>
    </div>
  );
};

export default CategoryBreakdown;
