import knex from '../models/_config';

interface CachedSetting {
    id: string;
    name: string;
    label: string;
    value: string;
    group: string;
    editable: boolean;
}

let cache: Map<string, CachedSetting> | null = null;

export async function ensureLoaded(): Promise<void> {
    if (cache) return;
    const rows: CachedSetting[] = await knex('settings').select('*');
    cache = new Map(rows.map((r) => [r.name, r]));
}

export function getAll(): CachedSetting[] {
    return cache ? [...cache.values()] : [];
}

export function get(name: string): CachedSetting | undefined {
    return cache?.get(name);
}

export function invalidate(): void {
    cache = null;
}
