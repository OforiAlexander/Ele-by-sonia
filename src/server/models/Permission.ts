import { Model } from 'objection';

export default class Permission extends Model {
  static tableName = 'permissions';

  id!: string;
  name!: string;
  label!: string;
  resource!: string;
  is_sensitive!: boolean;
  enabled!: boolean;
  created_at!: string;
}
