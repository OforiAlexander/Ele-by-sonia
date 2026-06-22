import { Model, RelationMappingsThunk } from 'objection';
import BaseModel from './_root';

export default class Role extends BaseModel {
  static tableName = 'roles';

  id!: string;
  name!: string;
  description?: string;
  created_by?: string;
  created_at!: string;
  updated_at?: string;

  permissions?: Array<{ id: string; name: string; label: string }>;

  static get relationMappings(): ReturnType<RelationMappingsThunk> {
    const Permission = require('./Permission').default;
    const RolePermission = require('./RolePermission').default;

    return {
      permissions: {
        relation: Model.ManyToManyRelation,
        modelClass: Permission,
        join: {
          from: 'roles.id',
          through: {
            modelClass: RolePermission,
            from: 'role_permissions.role_id',
            to: 'role_permissions.permission_id',
          },
          to: 'permissions.id',
        },
      },
    };
  }
}
