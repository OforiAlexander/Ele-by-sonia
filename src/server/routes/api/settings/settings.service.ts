import knex from '../../../models/_config';
import { ensureLoaded, getAll, get, invalidate } from '../../../startup/settingsCache';
import { SETTINGS, SETTING_DEFINITIONS } from '../../../constants/settings';
import type { SettingDefinition } from '../../../constants/settings';

const PUBLIC_SETTINGS = new Set([
    // Business identity (receipt + report headers)
    SETTINGS.BUSINESS_NAME,
    SETTINGS.BUSINESS_TAGLINE,
    SETTINGS.BUSINESS_PHONE,
    SETTINGS.BUSINESS_EMAIL,
    SETTINGS.BUSINESS_WEBSITE,
    SETTINGS.BUSINESS_REGISTRATION_NUMBER,
    SETTINGS.GRA_TIN,
    SETTINGS.RECEIPT_STORE_ADDRESS,
    SETTINGS.RECEIPT_FOOTER_MESSAGE,
    SETTINGS.RECEIPT_FOOTER_LINE_2,
    // Receipt layout
    SETTINGS.RECEIPT_PAPER_WIDTH,
    SETTINGS.RECEIPT_SHOW_LOGO,
    SETTINGS.RECEIPT_SHOW_CASHIER,
    SETTINGS.RECEIPT_SHOW_REFUND_POLICY,
    SETTINGS.RECEIPT_SHOW_PHONE,
    SETTINGS.RECEIPT_SHOW_EMAIL,
    SETTINGS.RECEIPT_SHOW_WEBSITE,
    SETTINGS.RECEIPT_SHOW_SALE_REF,
    SETTINGS.RECEIPT_SHOW_UNIT_PRICES,
    SETTINGS.RECEIPT_SHOW_ITEM_SKU,
    SETTINGS.RECEIPT_SHOW_LEVY,
    SETTINGS.RECEIPT_SHOW_DISCOUNT,
    SETTINGS.RECEIPT_SHOW_CHANGE,
    SETTINGS.RECEIPT_SHOW_TAX_BREAKDOWN,
    // Sales policy
    SETTINGS.REFUND_VALIDITY_DAYS,
    SETTINGS.INVENTORY_LEVY_ENABLED,
    // POS checkout behaviour
    SETTINGS.SPLIT_TENDER_ENABLED,
    SETTINGS.ALLOW_PRICE_OVERRIDE,
    SETTINGS.CASH_ROUNDING_ENABLED,
    SETTINGS.REQUIRE_CUSTOMER_PHONE_FOR_MOMO,
    SETTINGS.MOMO_PROMPT_CUSTOMER_TEXT,
    // Ghana tax
    SETTINGS.VAT_ENABLED,
    SETTINGS.NHIL_ENABLED,
    SETTINGS.GETFUND_ENABLED,
    SETTINGS.COVID_LEVY_ENABLED,
    SETTINGS.TAX_INCLUSIVE_PRICING,
    // POS security
    SETTINGS.POS_IDLE_LOCK_MINUTES,
]);

const defMap = new Map<string, SettingDefinition>(SETTING_DEFINITIONS.map((d) => [d.name, d]));

function validateSettingValue(def: SettingDefinition, value: string): string | null {
    switch (def.type) {
        case 'boolean':
            if (value !== 'true' && value !== 'false') {
                return `Value must be "true" or "false".`;
            }
            break;
        case 'number': {
            const n = parseFloat(value);
            if (isNaN(n)) return 'Value must be a number.';
            if (def.min !== undefined && n < def.min) return `Value must be at least ${def.min}.`;
            if (def.max !== undefined && n > def.max) return `Value must be at most ${def.max}.`;
            break;
        }
        case 'time':
            if (!/^\d{2}:\d{2}$/.test(value)) return 'Value must be in HH:mm format (e.g. "22:00").';
            {
                const [h, m] = value.split(':').map(Number);
                if (h < 0 || h > 23 || m < 0 || m > 59) return 'Value must be a valid time (00:00–23:59).';
            }
            break;
        case 'enum':
            if (def.options && !def.options.includes(value)) {
                return `Value must be one of: ${def.options.join(', ')}.`;
            }
            break;
        default:
            break;
    }
    return null;
}

export async function listSettings() {
    await ensureLoaded();
    return getAll().map((s) => {
        const def = defMap.get(s.name);
        return {
            ...s,
            type:             def?.type             ?? 'string',
            unit:             def?.unit             ?? null,
            hint:             def?.hint             ?? null,
            options:          def?.options          ?? null,
            min:              def?.min              ?? null,
            max:              def?.max              ?? null,
            restart_required: def?.restart_required ?? false,
        };
    });
}

export async function listPublicSettings(): Promise<Record<string, string>> {
    await ensureLoaded();
    const result: Record<string, string> = {};
    for (const name of PUBLIC_SETTINGS) {
        const cached = get(name);
        if (cached) result[name] = cached.value;
    }
    return result;
}

export async function updateSetting(name: string, value: string) {
    await ensureLoaded();
    const current = get(name as any);
    if (!current) throw Object.assign(new Error('Setting not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!current.editable) throw Object.assign(new Error('This setting cannot be changed.'), { status: 400, code: 'NOT_EDITABLE' });

    const def = defMap.get(name);
    if (def) {
        const validationError = validateSettingValue(def, value);
        if (validationError) {
            throw Object.assign(new Error(validationError), { status: 422, code: 'VALIDATION_ERROR' });
        }
    }

    const [row] = await knex('settings').where({ name }).update({ value }).returning('*');
    invalidate();

    // Return the enriched shape (same as listSettings) so the controller response matches AppSetting
    const updated = {
        ...row,
        type:             def?.type             ?? 'string',
        unit:             def?.unit             ?? null,
        hint:             def?.hint             ?? null,
        options:          def?.options          ?? null,
        min:              def?.min              ?? null,
        max:              def?.max              ?? null,
        restart_required: def?.restart_required ?? false,
    };

    return { updated, oldValue: current.value };
}
