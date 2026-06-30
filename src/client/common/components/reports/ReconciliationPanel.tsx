import React from 'react';
import { Center, Loader, Paper, Stack, Text } from '@mantine/core';
import { useReport } from '../../hooks/useReport';
import { useCurrency } from '../../hooks/useCurrency';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Period } from './PeriodSelector';
import type { Reconciliation } from '../../types';
import ReportStatGrid from './ReportStatGrid';

interface Props {
    period: Period;
    date:   string | undefined;
}

const ReconciliationPanel: React.FC<Props> = ({ period, date }) => {
    const { formatPrice } = useCurrency();
    const { data, loading } = useReport<Reconciliation>('/reports/reconciliation', { period, date });

    if (loading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }
    if (!data) {
        return <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>;
    }

    return (
        <Stack gap="lg">
            <ReportStatGrid
                cols={{ base: 2, sm: 4 }}
                items={[
                    { label: t(KEYS.reports.reconciliation.cashTotal),    value: formatPrice(data.cashTotal) },
                    { label: t(KEYS.reports.reconciliation.momoTotal),    value: formatPrice(data.momoTotal) },
                    { label: t(KEYS.reports.reconciliation.totalRevenue), value: formatPrice(data.totalRevenue), color: 'teal' },
                    { label: t(KEYS.reports.reconciliation.netCashExpected), value: formatPrice(data.netCashExpected), color: 'teal' },
                ]}
            />

            <Paper withBorder radius="md" p="md">
                <Text fw={600} size="sm" mb="sm">{t(KEYS.reports.reconciliation.title)}</Text>
                <ReportStatGrid
                    cols={{ base: 2, sm: 4 }}
                    items={[
                        { label: t(KEYS.reports.reconciliation.cashCount),         value: String(data.cashCount) },
                        { label: t(KEYS.reports.reconciliation.momoCount),         value: String(data.momoCount) },
                        { label: t(KEYS.reports.reconciliation.totalTransactions), value: String(data.totalTransactions) },
                        { label: t(KEYS.reports.reconciliation.unitsSold),         value: String(data.unitsSold) },
                    ]}
                />
                <ReportStatGrid
                    cols={{ base: 2, sm: 4 }}
                    items={[
                        { label: t(KEYS.reports.reconciliation.cogsTotal),     value: formatPrice(data.cogsTotal) },
                        { label: t(KEYS.reports.reconciliation.grossProfit),   value: formatPrice(data.grossProfit), color: 'teal' },
                        { label: t(KEYS.reports.reconciliation.discountTotal),value: formatPrice(data.discountTotal) },
                        { label: t(KEYS.reports.reconciliation.levyTotal),     value: formatPrice(data.levyTotal) },
                    ]}
                />
                <ReportStatGrid
                    cols={{ base: 2, sm: 4 }}
                    items={[
                        { label: t(KEYS.reports.reconciliation.returnCount), value: String(data.returnCount) },
                        { label: t(KEYS.reports.reconciliation.returnTotal), value: formatPrice(data.returnTotal), color: 'red' },
                        { label: t(KEYS.reports.reconciliation.voidCount),   value: String(data.voidCount) },
                        { label: t(KEYS.reports.reconciliation.voidTotal),   value: formatPrice(data.voidTotal), color: 'red' },
                    ]}
                />
            </Paper>
        </Stack>
    );
};

export default ReconciliationPanel;
