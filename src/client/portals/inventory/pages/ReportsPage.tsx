import React, { useState } from 'react';
import { Paper, Stack, Tabs } from '@mantine/core';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { toLocalDate } from '../../../common/utils/dateUtils';
import PeriodSelector, { Period } from '../../../common/components/reports/PeriodSelector';
import SummaryPanel from '../../../common/components/reports/SummaryPanel';
import ProfitPanel from '../../../common/components/reports/ProfitPanel';
import TopProductsPanel from '../../../common/components/reports/TopProductsPanel';
import StockHealthPanel from '../../../common/components/reports/StockHealthPanel';
import TaxPanel from '../../../common/components/reports/TaxPanel';
import StockMovementsPanel from '../../../common/components/reports/StockMovementsPanel';
import ReturnsPanel from '../../../common/components/reports/ReturnsPanel';
import ActivityPanel from '../../../common/components/reports/ActivityPanel';
import ReconciliationPanel from '../../../common/components/reports/ReconciliationPanel';

const TABS = [
    { key: 'summary',        label: KEYS.reports.tabs.summary },
    { key: 'profit',         label: KEYS.reports.tabs.profit },
    { key: 'topProducts',    label: KEYS.reports.tabs.topProducts },
    { key: 'reconciliation', label: KEYS.reports.tabs.reconciliation },
    { key: 'tax',            label: KEYS.reports.tabs.tax },
    { key: 'stockHealth',    label: KEYS.reports.tabs.stockHealth },
    { key: 'stockMovements', label: KEYS.reports.tabs.stockMovements },
    { key: 'returns',        label: KEYS.reports.tabs.returns },
    { key: 'activity',       label: KEYS.reports.tabs.activity },
] as const;

type TabKey = typeof TABS[number]['key'];

const PERIOD_TABS: TabKey[] = ['summary', 'profit', 'topProducts', 'reconciliation', 'tax', 'stockMovements', 'returns'];

const ReportsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('summary');
    const [period, setPeriod] = useState<Period>('monthly');
    const [date, setDate]     = useState<Date | null>(null);

    const dateParam = date ? toLocalDate(date) : undefined;
    const showPeriodSelector = PERIOD_TABS.includes(activeTab);

    return (
        <Stack gap="xl">
            <div>
                <h1 className="ptitle">{t(KEYS.reports.title)}</h1>
                <p className="psub">{t(KEYS.reports.subtitle)}</p>
            </div>

            <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v as TabKey)} color="green" keepMounted={false}>
                    <Tabs.List className="settings-tabs-list" style={{ borderBottom: '1px solid #ECEFEC', padding: '0 16px' }}>
                        {TABS.map((tab) => (
                            <Tabs.Tab key={tab.key} value={tab.key}>
                                {t(tab.label)}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>

                    {TABS.map((tab) => (
                        <Tabs.Panel key={tab.key} value={tab.key} p="xl">
                            {showPeriodSelector && (
                                <PeriodSelector period={period} date={date} onPeriod={setPeriod} onDate={setDate} />
                            )}

                            {tab.key === 'summary'        && <SummaryPanel period={period} date={dateParam} />}
                            {tab.key === 'profit'         && <ProfitPanel period={period} date={dateParam} />}
                            {tab.key === 'topProducts'    && <TopProductsPanel period={period} date={dateParam} />}
                            {tab.key === 'reconciliation' && <ReconciliationPanel period={period} date={dateParam} />}
                            {tab.key === 'tax'            && <TaxPanel period={period} date={dateParam} />}
                            {tab.key === 'stockHealth'    && <StockHealthPanel />}
                            {tab.key === 'stockMovements' && <StockMovementsPanel period={period} date={dateParam} />}
                            {tab.key === 'returns'        && <ReturnsPanel period={period} date={dateParam} />}
                            {tab.key === 'activity'       && <ActivityPanel />}
                        </Tabs.Panel>
                    ))}
                </Tabs>
            </Paper>
        </Stack>
    );
};

export default ReportsPage;
