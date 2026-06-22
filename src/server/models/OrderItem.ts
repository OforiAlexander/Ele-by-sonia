import { Model, RelationMappingsThunk } from 'objection';

// Phase 2
export default class OrderItem extends Model {
  static tableName = 'order_items';

  id!: string;
  order_id!: string;
  variant_id!: string;
  quantity!: number;
  unit_price!: number;
  line_total!: number;
  cost_price_snapshot!: number;

  variant?: unknown;

  static get relationMappings(): ReturnType<RelationMappingsThunk> {
    const ProductVariant = require('./ProductVariant').default;

    return {
      variant: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProductVariant,
        join: { from: 'order_items.variant_id', to: 'product_variants.id' },
      },
    };
  }
}
