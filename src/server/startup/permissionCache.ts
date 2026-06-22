import knex from '../models/_config';

let cache: Map<string, string[]> | null = null;

export async function ensureLoaded(): Promise<void> {
    if (cache) return;
    const rows = await knex('role_permissions as rp')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .select('rp.role_id', 'p.name');
    cache = new Map();
    for (const row of rows) {
        const existing = cache.get(row.role_id);
        if (existing) {
            existing.push(row.name);
        } else {
            cache.set(row.role_id, [row.name]);
        }
    }
}

export function getPermissionNames(roleId: string | undefined): string[] {
    if (!roleId || !cache) return [];
    return cache.get(roleId) ?? [];
}

export function invalidate(): void {
    cache = null;
}
