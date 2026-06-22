import Permission from '../../../models/Permission';

export async function getPermissionsGrouped(): Promise<Record<string, Permission[]>> {
    const permissions = await Permission.query().where({ enabled: true }).orderBy('resource').orderBy('name');

    return permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
        if (!acc[perm.resource]) acc[perm.resource] = [];
        acc[perm.resource].push(perm);
        return acc;
    }, {});
}
