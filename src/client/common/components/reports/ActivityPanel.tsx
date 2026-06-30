import React, { useState } from 'react';
import { Button, Center, Group, Loader, Pagination, Select, Table, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useReport } from '../../hooks/useReport';
import { useStaff } from '../../hooks/useStaff';
import { formatDateTime, toLocalDate } from '../../utils/dateUtils';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { ActivityLog } from '../../types';
import TableScrollWrap from '../TableScrollWrap';

const PAGE_SIZE = 25;

const ActivityPanel: React.FC = () => {
    const { staff } = useStaff();
    const [page, setPage]     = useState(1);
    const [action, setAction]   = useState('');
    const [entityType, setEntityType] = useState('');
    const [userId, setUserId]   = useState<string | null>(null);
    const [from, setFrom]       = useState<Date | null>(null);
    const [to, setTo]           = useState<Date | null>(null);
    const [applied, setApplied] = useState({ action: '', entityType: '', userId: null as string | null, from: null as Date | null, to: null as Date | null });

    const { data, loading } = useReport<ActivityLog>('/reports/activity', {
        page,
        limit: PAGE_SIZE,
        action: applied.action || undefined,
        entityType: applied.entityType || undefined,
        userId: applied.userId ?? undefined,
        from: applied.from ? toLocalDate(applied.from) : undefined,
        to: applied.to ? toLocalDate(applied.to) : undefined,
    });

    const staffOptions = staff.map((s) => ({ value: s.id, label: s.name }));
    const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

    const handleApply = () => {
        setPage(1);
        setApplied({ action, entityType, userId, from, to });
    };

    const handleClear = () => {
        setAction(''); setEntityType(''); setUserId(null); setFrom(null); setTo(null);
        setPage(1);
        setApplied({ action: '', entityType: '', userId: null, from: null, to: null });
    };

    return (
        <>
            <Group mb="md" gap="sm" align="flex-end" wrap="wrap">
                <TextInput
                    label={t(KEYS.reports.activity.filter.action)}
                    placeholder="e.g. STOCK_ADJUSTED"
                    value={action}
                    onChange={(e) => setAction(e.currentTarget.value)}
                    size="sm"
                    style={{ width: 180 }}
                />
                <TextInput
                    label={t(KEYS.reports.activity.filter.entityType)}
                    placeholder="e.g. sale"
                    value={entityType}
                    onChange={(e) => setEntityType(e.currentTarget.value)}
                    size="sm"
                    style={{ width: 150 }}
                />
                <Select
                    label={t(KEYS.reports.activity.filter.user)}
                    placeholder={t(KEYS.transactions.filter.allMethods)}
                    data={staffOptions}
                    value={userId}
                    onChange={setUserId}
                    clearable
                    searchable
                    size="sm"
                    style={{ width: 180 }}
                />
                <DatePickerInput
                    label={t(KEYS.reports.activity.filter.from)}
                    value={from}
                    onChange={setFrom}
                    clearable
                    size="sm"
                    style={{ width: 150 }}
                />
                <DatePickerInput
                    label={t(KEYS.reports.activity.filter.to)}
                    value={to}
                    onChange={setTo}
                    clearable
                    size="sm"
                    style={{ width: 150 }}
                />
                <Button size="sm" color="green" onClick={handleApply}>{t(KEYS.common.apply)}</Button>
                <Button size="sm" variant="subtle" color="gray" onClick={handleClear}>{t(KEYS.common.clear)}</Button>
            </Group>

            {loading ? (
                <Center py="xl"><Loader size="sm" /></Center>
            ) : !data || data.logs.length === 0 ? (
                <Center py="xl"><Text c="dimmed" size="sm">{t(KEYS.reports.empty)}</Text></Center>
            ) : (
                <>
                    <TableScrollWrap minWidth={640} className="table-sticky-col">
                        <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>{t(KEYS.reports.activity.table.date)}</Table.Th>
                                    <Table.Th>{t(KEYS.reports.activity.table.user)}</Table.Th>
                                    <Table.Th>{t(KEYS.reports.activity.table.action)}</Table.Th>
                                    <Table.Th>{t(KEYS.reports.activity.table.entityType)}</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {data.logs.map((log) => (
                                    <Table.Tr key={log.id}>
                                        <Table.Td>
                                            <Text size="xs" c="dimmed">{formatDateTime(log.createdAt)}</Text>
                                        </Table.Td>
                                        <Table.Td>{log.userName}</Table.Td>
                                        <Table.Td>
                                            <Text size="xs" ff="monospace">{log.action}</Text>
                                        </Table.Td>
                                        <Table.Td>{log.entityType}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </TableScrollWrap>

                    {totalPages > 1 && (
                        <Group justify="center" mt="md">
                            <Pagination total={totalPages} value={page} onChange={setPage} color="green" size="sm" />
                        </Group>
                    )}
                </>
            )}
        </>
    );
};

export default ActivityPanel;
