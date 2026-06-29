import React, { useEffect, useState } from 'react';
import { Center, Grid, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from '../../../common/hooks/useDashboardSummary';
import { useStockHealth } from '../../../common/hooks/useStockHealth';
import KpiCard from '../../../common/components/KpiCard';
import KpiCount from '../../../common/components/KpiCount';
import SalesTrendChart from '../../../common/components/SalesTrendChart';
import TopItemsPanel from '../../../common/components/TopItemsPanel';
import StockHealthRing from '../../../common/components/StockHealthRing';
import CategoryBreakdown from '../../../common/components/CategoryBreakdown';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { useCurrency } from '../../../common/hooks/useCurrency';
import { formatCount } from '../../../common/utils/formatCount';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { data, loading, hasError }     = useDashboardSummary();
  const { stockHealth, loading: sLoad } = useStockHealth();
  const [active, setActive]             = useState(false);
  const [range, setRange]               = useState<'7D' | '30D' | '12M'>('12M');

  useEffect(() => {
    if (loading || sLoad) return;
    let id2: number;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setActive(true));
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, [loading, sLoad]);

  if (loading || sLoad || !data || !stockHealth) {
    return (
      <Center h={400}>
        <Text c="dimmed" size="sm">{t(KEYS.common.loadingDashboard)}</Text>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <h1 className="ptitle">{t(KEYS.dashboard.title)}</h1>
        <p className="psub">{t(KEYS.dashboard.subtitle)}</p>
      </div>

      {hasError && (
        <Text size="xs" c="orange">{t(KEYS.common.partialDataWarning)}</Text>
      )}

      <Grid gutter={14}>
        <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
          <KpiCard label={t(KEYS.dashboard.kpi.totalProducts)} icon="#" subtext={t(KEYS.dashboard.kpi.totalProductsSub)} delay="0.02s" active={active} onClick={() => navigate('/products')}>
            <KpiCount target={data.totalProducts} fmt={formatCount} active={active} />
          </KpiCard>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
          <KpiCard label={t(KEYS.dashboard.kpi.inventoryValue)} icon="₵" subtext={t(KEYS.dashboard.kpi.inventoryValueSub)} delay="0.07s" active={active} onClick={() => navigate('/products')}>
            <KpiCount target={stockHealth.inventoryValue} fmt={formatCurrency} active={active} />
          </KpiCard>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
          <KpiCard label={t(KEYS.dashboard.kpi.totalSales)} icon="↑" subtext={t(KEYS.dashboard.kpi.totalSalesSub)} delay="0.12s" active={active} onClick={() => navigate('/pos')}>
            <KpiCount target={data.totalSales} fmt={formatCurrency} active={active} />
          </KpiCard>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
          <KpiCard label={t(KEYS.dashboard.kpi.lowStock)} icon="▲" subtext={t(KEYS.dashboard.kpi.lowStockSub)} delay="0.17s" active={active} onClick={() => navigate('/products')}>
            <KpiCount target={stockHealth.lowStock} fmt={formatCount} active={active} />
          </KpiCard>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
          <KpiCard label={t(KEYS.dashboard.kpi.outOfStock)} icon="↓" subtext={t(KEYS.dashboard.kpi.outOfStockSub)} delay="0.22s" active={active} onClick={() => navigate('/products')}>
            <KpiCount target={stockHealth.outOfStock} fmt={formatCount} active={active} />
          </KpiCard>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
          <KpiCard label={t(KEYS.dashboard.kpi.topSellingItem)} icon="★" subtext={t(KEYS.dashboard.kpi.topSellingItemSub)} delay="0.27s" active={active} onClick={() => navigate('/reports')}>
            <Text fw={700} ff="'Space Grotesk', sans-serif" c="#11231B" lh={1.2} style={{ fontSize: 16 }}>
              {data.topSellingItem || t(KEYS.common.noData)}
            </Text>
          </KpiCard>
        </Grid.Col>
      </Grid>

      <Grid gutter={16}>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <SalesTrendChart initialChart={data.chart} range={range} onRangeChange={setRange} active={active} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <TopItemsPanel initialItems={data.topItems} range={range} active={active} />
        </Grid.Col>
      </Grid>

      <Grid gutter={16}>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <StockHealthRing stockHealth={stockHealth} active={active} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <CategoryBreakdown initialCategories={data.categories} range={range} active={active} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

export default DashboardPage;
