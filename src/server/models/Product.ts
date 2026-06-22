import { Model, RelationMappingsThunk } from 'objection';
import BaseModel from './_root';

export default class Product extends BaseModel {
    static tableName = 'products';

    id!: string;
    name!: string;
    description?: string;
    category!: string;
    brand?: string;
    is_active!: boolean;
    created_by!: string;
    created_at!: string;
    updated_at?: string;

    images?: Array<{ id: string; image_path: string; sort_order: number }>;
    variants?: unknown[];
    optionTypes?: unknown[];

    static get relationMappings(): ReturnType<RelationMappingsThunk> {
        const ProductImage = require('./ProductImage').default;
        const ProductVariant = require('./ProductVariant').default;
        const ProductOptionType = require('./ProductOptionType').default;

        return {
            images: {
                relation: Model.HasManyRelation,
                modelClass: ProductImage,
                join: { from: 'products.id', to: 'product_images.product_id' },
            },
            variants: {
                relation: Model.HasManyRelation,
                modelClass: ProductVariant,
                join: { from: 'products.id', to: 'product_variants.product_id' },
            },
            optionTypes: {
                relation: Model.HasManyRelation,
                modelClass: ProductOptionType,
                join: { from: 'products.id', to: 'product_option_types.product_id' },
            },
        };
    }
}
