import BaseModel from './_root';

// Phase 2
export default class Customer extends BaseModel {
  static tableName = 'customers';

  id!: string;
  email!: string;
  name!: string;
  phone!: string;
  password_hash!: string;
  is_active!: boolean;
  created_at!: string;
  updated_at?: string;
}
