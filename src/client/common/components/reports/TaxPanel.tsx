import React from 'react';
import { Center, Loader, Text } from '@mantine/core';
import { useReport } from '../../hooks/useReport';
import { useCurrency } from '../../hooks/useCurrency';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Period } from './PeriodSelector';
import type { TaxBreakdown } from '../../types';
import ReportStatGrid from './ReportStatGrid';

interface Props {
    period: Period;
    date:   string | undefined;
}

const TaxPanel: React.FC<Props> = ({ period, date }) => {
    const { formatPrice } = useCurrency();
    const { data, loading } = useReport<TaxBreakdown>('/reports/tax', { period, date });

    if (loading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }
    if (!data) {
        return <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>;
    }

    return (
        <ReportStatGrid
            cols={{ base: 2, sm: 3, md: 6 }}
            items={[
                { label: t(KEYS.reports.tax.vat),       value: formatPrice(data.vat) },
                { label: t(KEYS.reports.tax.nhil),      value: formatPrice(data.nhil) },
                { label: t(KEYS.reports.tax.getfund),   value: formatPrice(data.getfund) },
                { label: t(KEYS.reports.tax.covidLevy), value: formatPrice(data.covidLevy) },
                { label: t(KEYS.reports.tax.levy),      value: formatPrice(data.levy) },
                { label: t(KEYS.reports.tax.totalTax),  value: formatPrice(data.totalTax), color: 'teal' },
            ]}
        />
    );
};

export default TaxPanel;
