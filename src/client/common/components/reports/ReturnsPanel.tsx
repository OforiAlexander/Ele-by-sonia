import React from 'react';
import { Center, Loader, Table, Text } from '@mantine/core';
import { useReport } from '../../hooks/useReport';
import { useCurrency } from '../../hooks/useCurrency';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Period } from './PeriodSelector';
import type { ReturnsReport } from '../../types';
import ReportStatGrid from './ReportStatGrid';
import TableScrollWrap from '../TableScrollWrap';

interface Props {
    period: Period;
    date:   string | undefined;
}

const ReturnsPanel: React.FC<Props> = ({ period, date }) => {
    const { formatPrice } = useCurrency();
    const { data, loading } = useReport<ReturnsReport>('/reports/returns', { period, date });

    if (loading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }
    if (!data) {
        return <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>;
    }

    return (
        <>
            <ReportStatGrid
                cols={{ base: 2, sm: 2 }}
                items={[
                    { label: t(KEYS.reports.returns.returnCount), value: String(data.returnCount) },
                    { label: t(KEYS.reports.returns.returnTotal), value: formatPrice(data.returnTotal), color: 'red' },
                ]}
            />

            {data.byStaff.length === 0 ? (
                <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>
            ) : (
                <>
                    <Text fw={600} size="sm" mb="sm">{t(KEYS.reports.returns.byStaffTitle)}</Text>
                    <TableScrollWrap minWidth={420} className="table-sticky-col">
                        <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>{t(KEYS.reports.returns.table.staff)}</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.returns.table.count)}</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.reports.returns.table.total)}</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {data.byStaff.map((row) => (
                                    <Table.Tr key={row.staffId}>
                                        <Table.Td>{row.staffName}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{row.count}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>{formatPrice(row.total)}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </TableScrollWrap>
                </>
            )}
        </>
    );
};

export default ReturnsPanel;
