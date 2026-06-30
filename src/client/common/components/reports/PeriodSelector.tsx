import React from 'react';
import { Group } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { t } from '../../translations';
import { KEYS } from '../../keys';

export type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

const PERIODS: { value: Period; labelKey: string }[] = [
    { value: 'daily',     labelKey: KEYS.reports.period.daily },
    { value: 'weekly',    labelKey: KEYS.reports.period.weekly },
    { value: 'monthly',   labelKey: KEYS.reports.period.monthly },
    { value: 'quarterly', labelKey: KEYS.reports.period.quarterly },
    { value: 'annual',    labelKey: KEYS.reports.period.annual },
];

interface Props {
    period:     Period;
    date:       Date | null;
    onPeriod:   (p: Period) => void;
    onDate:     (d: Date | null) => void;
}

const PeriodSelector: React.FC<Props> = ({ period, date, onPeriod, onDate }) => (
    <Group gap="sm" wrap="wrap" mb="md">
        <div className="seg">
            {PERIODS.map((p) => (
                <div
                    key={p.value}
                    className={`segbtn${period === p.value ? ' active' : ''}`}
                    onClick={() => onPeriod(p.value)}
                >
                    {t(p.labelKey)}
                </div>
            ))}
        </div>
        <DatePickerInput
            value={date}
            onChange={onDate}
            placeholder={t(KEYS.common.pickDate)}
            clearable
            size="sm"
            style={{ width: 160 }}
        />
    </Group>
);

export default PeriodSelector;
