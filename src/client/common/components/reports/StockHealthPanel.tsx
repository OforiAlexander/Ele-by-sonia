import React from 'react';
import { Center, Loader, Text } from '@mantine/core';
import { useReport } from '../../hooks/useReport';
import { useCurrency } from '../../hooks/useCurrency';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { StockHealthData } from '../../types';
import ReportStatGrid from './ReportStatGrid';

const StockHealthPanel: React.FC = () => {
    const { formatPrice } = useCurrency();
    const { data, loading } = useReport<StockHealthData>('/reports/stock-health', {});

    if (loading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }
    if (!data) {
        return <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>;
    }

    return (
        <ReportStatGrid
            cols={{ base: 2, sm: 3, md: 5 }}
            items={[
                { label: t(KEYS.reports.stockHealth.total),          value: String(data.total) },
                { label: t(KEYS.reports.stockHealth.healthy),        value: String(data.healthy), color: 'teal' },
                { label: t(KEYS.reports.stockHealth.lowStock),       value: String(data.lowStock), color: 'orange' },
                { label: t(KEYS.reports.stockHealth.outOfStock),     value: String(data.outOfStock), color: 'red' },
                { label: t(KEYS.reports.stockHealth.inventoryValue), value: formatPrice(data.inventoryValue) },
            ]}
        />
    );
};

export default StockHealthPanel;
