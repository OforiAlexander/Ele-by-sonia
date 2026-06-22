import knex from '../../../models/_config';
import { ensureLoaded, getAll, get, invalidate } from '../../../startup/settingsCache';

export async function listSettings() {
    await ensureLoaded();
    return getAll();
}

export async function updateSetting(name: string, value: string) {
    await ensureLoaded();
    const current = get(name);
    if (!current) throw Object.assign(new Error('Setting not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!current.editable) throw Object.assign(new Error('This setting cannot be changed.'), { status: 400, code: 'NOT_EDITABLE' });

    const [updated] = await knex('settings').where({ name }).update({ value }).returning('*');
    invalidate();
    return { updated, oldValue: current.value };
}
