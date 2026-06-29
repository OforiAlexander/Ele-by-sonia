import { Model, RelationMappingsThunk } from 'objection';
import BaseModel from './_root';

export default class ProductVariant extends BaseModel {
    static tableName = 'product_variants';

    id!: string;
    product_id!: string;
    cost_price!: number;
    selling_price!: number;
    stock!: number;
    low_stock_threshold!: number;
    sku?: string;
    is_active!: boolean;
    created_at!: string;
    updated_at?: string;

    product?: { id: string; name: string };
    optionValues?: Array<{ id: string; option_type_id: string; value: string; optionType?: { id: string; name: string } }>;

    static get relationMappings(): ReturnType<RelationMappingsThunk> {
        const Product = require('./Product').default;
        const ProductOptionValue = require('./ProductOptionValue').default;

        return {
            product: {
                relation: Model.BelongsToOneRelation,
                modelClass: Product,
                join: { from: 'product_variants.product_id', to: 'products.id' },
            },
            optionValues: {
                relation: Model.ManyToManyRelation,
                modelClass: ProductOptionValue,
                join: {
                    from: 'product_variants.id',
                    through: {
                        from: 'variant_option_values.variant_id',
                        to: 'variant_option_values.option_value_id',
                    },
                    to: 'product_option_values.id',
                },
            },
        };
    }
}
