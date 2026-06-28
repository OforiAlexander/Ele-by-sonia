import BaseModel from './_root';

export default class Category extends BaseModel {
  static tableName = 'categories';

  id!: string;
  name!: string;
  created_at!: string;
  updated_at?: string;
}
