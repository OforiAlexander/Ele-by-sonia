import { Model } from 'objection';

export default class RolePermission extends Model {
  static tableName = 'role_permissions';

  id!: string;
  role_id!: string;
  permission_id!: string;
  created_at!: string;
}
