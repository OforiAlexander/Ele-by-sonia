import { Model } from 'objection';

export default class ProductImage extends Model {
  static tableName = 'product_images';

  id!: string;
  product_id!: string;
  image_path!: string;
  sort_order!: number;
  created_at!: string;
}
