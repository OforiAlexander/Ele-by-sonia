import Role from '../../../models/Role';
import knex from '../../../models/_config';
import { invalidate } from '../../../startup/permissionCache';

function withPermissions() {
    return Role.query().withGraphFetched('permissions').modifyGraph('permissions', (b) =>
        b.select('permissions.id', 'permissions.name', 'permissions.label', 'permissions.is_sensitive')
    );
}

export async function listRoles(): Promise<Role[]> {
    return withPermissions().orderBy('name');
}

export async function getRole(id: string): Promise<Role> {
    const role = await withPermissions().findById(id);
    if (!role) throw Object.assign(new Error('Role not found.'), { status: 404, code: 'NOT_FOUND' });
    return role;
}

export async function createRole(
    name: string,
    description: string | undefined,
    permissionIds: string[],
    createdBy: string
): Promise<Role> {
    const existing = await Role.query().findOne({ name });
    if (existing) throw Object.assign(new Error('A role with that name already exists.'), { status: 409, code: 'DUPLICATE' });

    const role = await knex.transaction(async (trx) => {
        const inserted = await Role.query(trx).insertAndFetch({ name, description, created_by: createdBy });
        if (permissionIds.length) {
            await trx('role_permissions').insert(
                permissionIds.map((permission_id) => ({ role_id: inserted.id, permission_id }))
            );
        }
        return inserted;
    });

    invalidate();
    return getRole(role.id);
}

export async function updateRole(
    id: string,
    name: string,
    description: string | undefined,
    permissionIds: string[]
): Promise<{ role: Role; before: { name: string; description: string | undefined; permissionIds: string[] } }> {
    const existing = await Role.query().findById(id);
    if (!existing) throw Object.assign(new Error('Role not found.'), { status: 404, code: 'NOT_FOUND' });

    const existingPermIds: string[] = await knex('role_permissions').where({ role_id: id }).pluck('permission_id');

    await knex.transaction(async (trx) => {
        await Role.query(trx).patchAndFetchById(id, { name, description });
        await trx('role_permissions').where({ role_id: id }).delete();
        if (permissionIds.length) {
            await trx('role_permissions').insert(
                permissionIds.map((permission_id) => ({ role_id: id, permission_id }))
            );
        }
    });

    invalidate();
    return {
        role: await getRole(id),
        before: { name: existing.name, description: existing.description, permissionIds: existingPermIds },
    };
}

export async function deleteRole(id: string): Promise<Role> {
    const role = await Role.query().findById(id);
    if (!role) throw Object.assign(new Error('Role not found.'), { status: 404, code: 'NOT_FOUND' });

    const userCount = await knex('users').where({ role_id: id }).count('id as count').first();
    if (Number(userCount?.count) > 0) {
        throw Object.assign(new Error('Cannot delete a role that is assigned to staff members.'), { status: 400, code: 'ROLE_IN_USE' });
    }

    await Role.query().deleteById(id);
    invalidate();
    return role;
}
