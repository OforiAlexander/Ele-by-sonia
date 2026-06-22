import { Model, RelationMappingsThunk } from 'objection';

export default class SaleItem extends Model {
  static tableName = 'sale_items';

  id!: string;
  sale_id!: string;
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
        join: { from: 'sale_items.variant_id', to: 'product_variants.id' },
      },
    };
  }
}
