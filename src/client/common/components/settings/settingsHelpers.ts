import * as Yup from 'yup';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { AppSetting } from '../../types';

export type GroupKey = 'general' | 'inventory' | 'payments' | 'reports' | 'ecommerce';

export const GROUPS: Array<{ key: GroupKey; label: string }> = [
    { key: 'general',   label: t(KEYS.settings.groups.general) },
    { key: 'inventory', label: t(KEYS.settings.groups.inventory) },
    { key: 'payments',  label: t(KEYS.settings.groups.payments) },
    { key: 'reports',   label: t(KEYS.settings.groups.reports) },
    { key: 'ecommerce', label: t(KEYS.settings.groups.ecommerce) },
];

export function buildSchema(settings: AppSetting[]): Yup.ObjectSchema<Record<string, unknown>> {
    const shape: Record<string, Yup.Schema> = {};
    for (const s of settings) {
        if (!s.editable) continue;
        if (s.type === 'number') {
            let rule = Yup.number().typeError('Must be a number');
            if (s.min !== null) rule = rule.min(s.min, `Must be at least ${s.min}`);
            if (s.max !== null) rule = rule.max(s.max, `Must be at most ${s.max}`);
            shape[s.name] = rule;
        } else if (s.type === 'time') {
            shape[s.name] = Yup.string()
                .matches(/^\d{2}:\d{2}$/, 'Format must be HH:mm')
                .required('Required');
        } else if (s.type === 'enum') {
            const allowed = s.options ?? [];
            shape[s.name] = Yup.string().oneOf(allowed, `Must be one of: ${allowed.join(', ')}`);
        } else {
            shape[s.name] = Yup.string();
        }
    }
    return Yup.object().shape(shape as Record<string, Yup.Schema<unknown>>);
}

export function buildInitialValues(settings: AppSetting[]): Record<string, string | number | boolean> {
    const vals: Record<string, string | number | boolean> = {};
    for (const s of settings) {
        if (s.type === 'boolean') {
            vals[s.name] = s.value === 'true';
        } else if (s.type === 'number') {
            vals[s.name] = parseFloat(s.value) || 0;
        } else {
            vals[s.name] = s.value;
        }
    }
    return vals;
}
