import React, { useState } from 'react';
import { Center, Group, Loader, Paper, Text } from '@mantine/core';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useReport } from '../../hooks/useReport';
import { useCurrency } from '../../hooks/useCurrency';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Period } from './PeriodSelector';
import type { ReportSummary, ReportChartData } from '../../types';
import ReportStatGrid from './ReportStatGrid';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const METRICS: { value: 'revenue' | 'profit' | 'units'; labelKey: string }[] = [
    { value: 'revenue', labelKey: KEYS.reports.chart.metric.revenue },
    { value: 'profit',  labelKey: KEYS.reports.chart.metric.profit },
    { value: 'units',   labelKey: KEYS.reports.chart.metric.units },
];

interface Props {
    period: Period;
    date:   string | undefined;
}

const SummaryPanel: React.FC<Props> = ({ period, date }) => {
    const { formatPrice } = useCurrency();
    const [metric, setMetric] = useState<'revenue' | 'profit' | 'units'>('revenue');

    const { data: summary, loading: summaryLoading } =
        useReport<ReportSummary>('/reports/summary', { period, date });
    const { data: chart, loading: chartLoading } =
        useReport<ReportChartData>('/reports/chart', { period, date, metric });

    if (summaryLoading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }
    if (!summary) {
        return <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>;
    }

    const chartData = {
        labels: chart?.labels ?? [],
        datasets: [{
            data: chart?.values ?? [],
            borderColor: '#0E7A52',
            backgroundColor: 'rgba(14,122,82,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2.5,
        }],
    };

    return (
        <>
            <ReportStatGrid
                cols={{ base: 2, sm: 3, md: 6 }}
                items={[
                    { label: t(KEYS.reports.summary.revenue),       value: formatPrice(summary.revenue) },
                    { label: t(KEYS.reports.summary.cost),          value: formatPrice(summary.cost) },
                    { label: t(KEYS.reports.summary.profit),        value: formatPrice(summary.profit), color: 'teal' },
                    { label: t(KEYS.reports.summary.marginPercent), value: `${summary.marginPercent}%` },
                    { label: t(KEYS.reports.summary.salesCount),    value: String(summary.salesCount) },
                    { label: t(KEYS.reports.summary.unitsSold),     value: String(summary.unitsSold) },
                ]}
            />

            <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="sm">
                    <Text fw={600} size="sm">{t(KEYS.reports.chart.title)}</Text>
                    <div className="seg">
                        {METRICS.map((m) => (
                            <div
                                key={m.value}
                                className={`segbtn${metric === m.value ? ' active' : ''}`}
                                onClick={() => setMetric(m.value)}
                            >
                                {t(m.labelKey)}
                            </div>
                        ))}
                    </div>
                </Group>
                {chartLoading ? (
                    <Center py="xl"><Loader size="sm" /></Center>
                ) : (
                    <div style={{ height: 260 }}>
                        <Line
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { display: false } },
                                    y: { beginAtZero: true, grid: { color: '#EEF1EF' } },
                                },
                            }}
                        />
                    </div>
                )}
            </Paper>
        </>
    );
};

export default SummaryPanel;
