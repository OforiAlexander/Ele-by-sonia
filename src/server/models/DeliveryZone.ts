import BaseModel from './_root';

// Phase 2
export default class DeliveryZone extends BaseModel {
  static tableName = 'delivery_zones';

  id!: string;
  name!: string;
  description?: string;
  fee!: number;
  is_active!: boolean;
  created_at!: string;
  updated_at?: string;
}
