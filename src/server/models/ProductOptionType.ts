import { Model, RelationMappingsThunk } from 'objection';
import BaseModel from './_root';

export default class ProductOptionType extends BaseModel {
    static tableName = 'product_option_types';

    id!: string;
    product_id!: string;
    name!: string;
    created_at!: string;

    values?: unknown[];

    static get relationMappings(): ReturnType<RelationMappingsThunk> {
        const ProductOptionValue = require('./ProductOptionValue').default;
        return {
            values: {
                relation: Model.HasManyRelation,
                modelClass: ProductOptionValue,
                join: { from: 'product_option_types.id', to: 'product_option_values.option_type_id' },
            },
        };
    }
}
