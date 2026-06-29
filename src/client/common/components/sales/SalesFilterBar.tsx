import React from 'react';
import { Group, Button, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface Props {
    filterFrom:      Date | null;
    filterTo:        Date | null;
    filterMethod:    string | null;
    filterStatus?:   string | null;
    onFromChange:    (v: Date | null) => void;
    onToChange:      (v: Date | null) => void;
    onMethodChange:  (v: string | null) => void;
    onStatusChange?: (v: string | null) => void;
    onApply:         () => void;
    onClear:         () => void;
    hasFilters:      boolean;
}

const METHOD_DATA = [
    { value: 'cash', label: t(KEYS.common.method.cash) },
    { value: 'momo', label: t(KEYS.common.method.momo) },
];

const STATUS_DATA = [
    { value: 'paid',    label: t(KEYS.salesHistory.status.paid) },
    { value: 'pending', label: t(KEYS.salesHistory.status.pending) },
    { value: 'failed',  label: t(KEYS.salesHistory.status.failed) },
];

const SalesFilterBar: React.FC<Props> = ({
    filterFrom, filterTo, filterMethod, filterStatus,
    onFromChange, onToChange, onMethodChange, onStatusChange,
    onApply, onClear, hasFilters,
}) => (
    <Group mb="md" gap="sm" align="flex-end" wrap="wrap">
        <DatePickerInput
            label={t(KEYS.salesHistory.filter.from)}
            placeholder={t(KEYS.common.pickDate)}
            value={filterFrom}
            onChange={onFromChange}
            clearable
            size="sm"
            style={{ width: 160 }}
        />
        <DatePickerInput
            label={t(KEYS.salesHistory.filter.to)}
            placeholder={t(KEYS.common.pickDate)}
            value={filterTo}
            onChange={onToChange}
            clearable
            size="sm"
            style={{ width: 160 }}
        />
        <Select
            label={t(KEYS.salesHistory.filter.method)}
            placeholder={t(KEYS.salesHistory.filter.allMethods)}
            value={filterMethod}
            onChange={onMethodChange}
            data={METHOD_DATA}
            clearable
            size="sm"
            style={{ width: 170 }}
        />
        {onStatusChange !== undefined && (
            <Select
                label={t(KEYS.transactions.filter.status)}
                placeholder={t(KEYS.transactions.filter.allStatus)}
                value={filterStatus ?? null}
                onChange={onStatusChange}
                data={STATUS_DATA}
                clearable
                size="sm"
                style={{ width: 140 }}
            />
        )}
        <Button size="sm" color="green" style={{ marginTop: 24 }} onClick={onApply}>
            {t(KEYS.common.apply)}
        </Button>
        {hasFilters && (
            <Button size="sm" variant="subtle" color="gray" style={{ marginTop: 24 }} onClick={onClear}>
                {t(KEYS.common.clear)}
            </Button>
        )}
    </Group>
);

export default SalesFilterBar;
