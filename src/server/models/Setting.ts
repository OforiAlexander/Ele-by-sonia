import { Model } from 'objection';

export default class Setting extends Model {
  static tableName = 'settings';

  id!: string;
  name!: string;
  label!: string;
  value!: string;
  group!: string;
  editable!: boolean;
  created_at!: string;
}
