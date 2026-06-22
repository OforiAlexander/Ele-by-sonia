import Role from '../models/Role';
import Permission from '../models/Permission';
import RolePermission from '../models/RolePermission';
import { v4 as uuidv4 } from 'uuid';
import logger from '../services/logger';

const STARTER_ROLES = [
  {
    name: 'Cashier',
    description: 'Processes in-store sales and views products.',
    permissions: [
      'products.view',
      'variants.view',
      'stock.view',
      'sales.process',
      'sales.view',
    ],
  },
  {
    name: 'Stock Manager',
    description: 'Manages product stock and catalogue.',
    permissions: [
      'products.view',
      'products.create',
      'products.update',
      'variants.view',
      'variants.create',
      'variants.update',
      'stock.view',
      'stock.add',
    ],
  },
];

export async function ensureDefaultRoles(): Promise<void> {
  const count = await Role.query().resultSize();

  if (count > 0) {
    logger.info('Roles already exist — skipping default role seed.');
    return;
  }

  logger.info('Seeding default roles…');

  for (const def of STARTER_ROLES) {
    const role = await Role.query().insert({ id: uuidv4(), name: def.name, description: def.description });

    const perms = await Permission.query().whereIn('name', def.permissions);

    for (const perm of perms) {
      await RolePermission.query().insert({
        id: uuidv4(),
        role_id: role.id,
        permission_id: perm.id,
      });
    }

    logger.info(`  + Role created: ${def.name}`);
  }
}
