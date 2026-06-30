import React from 'react';
import { Center, Loader, Table, Text } from '@mantine/core';
import { useReport } from '../../hooks/useReport';
import { formatDateTime } from '../../utils/dateUtils';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Period } from './PeriodSelector';
import type { StockMovementsReport } from '../../types';
import ReportStatGrid from './ReportStatGrid';
import TableScrollWrap from '../TableScrollWrap';

interface Props {
    period: Period;
    date:   string | undefined;
}

const StockMovementsPanel: React.FC<Props> = ({ period, date }) => {
    const { data, loading } = useReport<StockMovementsReport>('/reports/stock-movements', { period, date, limit: 100 });

    if (loading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }
    if (!data) {
        return <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>;
    }

    return (
        <>
            <ReportStatGrid
                cols={{ base: 3, sm: 3 }}
                items={[
                    { label: t(KEYS.reports.stockMovements.totalAdded),   value: `+${data.totalAdded}`, color: 'teal' },
                    { label: t(KEYS.reports.stockMovements.totalRemoved), value: `-${data.totalRemoved}`, color: 'red' },
                    { label: t(KEYS.reports.stockMovements.entryCount),   value: String(data.entryCount) },
                ]}
            />

            {data.entries.length === 0 ? (
                <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>
            ) : (
                <TableScrollWrap minWidth={640} className="table-sticky-col">
                    <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t(KEYS.reports.stockMovements.table.date)}</Table.Th>
                                <Table.Th>{t(KEYS.reports.stockMovements.table.product)}</Table.Th>
                                <Table.Th>{t(KEYS.reports.stockMovements.table.sku)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.stockMovements.table.quantity)}</Table.Th>
                                <Table.Th>{t(KEYS.reports.stockMovements.table.note)}</Table.Th>
                                <Table.Th>{t(KEYS.reports.stockMovements.table.staff)}</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {data.entries.map((entry) => (
                                <Table.Tr key={entry.id}>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">{formatDateTime(entry.createdAt)}</Text>
                                    </Table.Td>
                                    <Table.Td>{entry.productName}</Table.Td>
                                    <Table.Td>
                                        <Text size="xs" ff="monospace" c="dimmed">{entry.sku ?? '—'}</Text>
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>
                                        <Text fw={600} c={entry.quantity >= 0 ? 'teal' : 'red'}>
                                            {entry.quantity >= 0 ? `+${entry.quantity}` : entry.quantity}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>{entry.note ?? '—'}</Table.Td>
                                    <Table.Td>{entry.staffName}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </TableScrollWrap>
            )}
        </>
    );
};

export default StockMovementsPanel;
