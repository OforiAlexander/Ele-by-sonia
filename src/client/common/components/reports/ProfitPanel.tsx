import React, { useState } from 'react';
import { Center, Loader, Select, Table, Text } from '@mantine/core';
import { useReport } from '../../hooks/useReport';
import { useCurrency } from '../../hooks/useCurrency';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Period } from './PeriodSelector';
import type { ProfitBreakdownItem } from '../../types';
import TableScrollWrap from '../TableScrollWrap';

type GroupBy = 'category' | 'product' | 'payment_method' | 'staff';

const GROUP_BY_OPTIONS: { value: GroupBy; labelKey: string }[] = [
    { value: 'category',       labelKey: KEYS.reports.profit.groupBy.category },
    { value: 'product',        labelKey: KEYS.reports.profit.groupBy.product },
    { value: 'payment_method', labelKey: KEYS.reports.profit.groupBy.paymentMethod },
    { value: 'staff',          labelKey: KEYS.reports.profit.groupBy.staff },
];

interface Props {
    period: Period;
    date:   string | undefined;
}

const ProfitPanel: React.FC<Props> = ({ period, date }) => {
    const { formatPrice } = useCurrency();
    const [groupBy, setGroupBy] = useState<GroupBy>('category');

    const { data, loading } = useReport<ProfitBreakdownItem[]>('/reports/profit', { period, date, groupBy });
    const groupByData = GROUP_BY_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }));

    return (
        <>
            <Select
                label={t(KEYS.reports.profit.table.group)}
                data={groupByData}
                value={groupBy}
                onChange={(v) => setGroupBy((v as GroupBy) ?? 'category')}
                allowDeselect={false}
                size="sm"
                mb="md"
                style={{ width: 220 }}
            />

            {loading ? (
                <Center py="xl"><Loader size="sm" /></Center>
            ) : !data || data.length === 0 ? (
                <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>
            ) : (
                <TableScrollWrap minWidth={520} className="table-sticky-col">
                    <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t(KEYS.reports.profit.table.group)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.profit.table.revenue)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.profit.table.cost)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.profit.table.profit)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.profit.table.margin)}</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {data.map((row) => (
                                <Table.Tr key={row.group}>
                                    <Table.Td>{row.group}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{formatPrice(row.revenue)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{formatPrice(row.cost)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{formatPrice(row.profit)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{row.margin}%</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </TableScrollWrap>
            )}
        </>
    );
};

export default ProfitPanel;
