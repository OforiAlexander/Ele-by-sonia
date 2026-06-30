import React from 'react';
import { Center, Loader, Table, Text } from '@mantine/core';
import { useReport } from '../../hooks/useReport';
import { useCurrency } from '../../hooks/useCurrency';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Period } from './PeriodSelector';
import type { TopProduct } from '../../types';
import TableScrollWrap from '../TableScrollWrap';

interface Props {
    period: Period;
    date:   string | undefined;
}

const TopProductsPanel: React.FC<Props> = ({ period, date }) => {
    const { formatPrice } = useCurrency();
    const { data, loading } = useReport<TopProduct[]>('/reports/top-products', { period, date, limit: 20 });

    if (loading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }
    if (!data || data.length === 0) {
        return <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>;
    }

    return (
        <TableScrollWrap minWidth={600} className="table-sticky-col">
            <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>{t(KEYS.reports.topProducts.table.product)}</Table.Th>
                        <Table.Th>{t(KEYS.reports.topProducts.table.sku)}</Table.Th>
                        <Table.Th>{t(KEYS.reports.topProducts.table.options)}</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.topProducts.table.unitsSold)}</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.topProducts.table.revenue)}</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {data.map((row) => (
                        <Table.Tr key={row.variantId}>
                            <Table.Td>{row.productName}</Table.Td>
                            <Table.Td>
                                <Text size="xs" ff="monospace" c="dimmed">{row.sku ?? '—'}</Text>
                            </Table.Td>
                            <Table.Td>{row.options ?? '—'}</Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>{row.unitsSold}</Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>{formatPrice(row.revenue)}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </TableScrollWrap>
    );
};

export default TopProductsPanel;
