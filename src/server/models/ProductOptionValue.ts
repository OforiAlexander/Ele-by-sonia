import { Model, RelationMappingsThunk } from 'objection';
import BaseModel from './_root';

export default class ProductOptionValue extends BaseModel {
    static tableName = 'product_option_values';

    id!: string;
    option_type_id!: string;
    value!: string;
    created_at!: string;

    optionType?: { id: string; product_id: string; name: string; created_at: string };

    static get relationMappings(): ReturnType<RelationMappingsThunk> {
        const ProductOptionType = require('./ProductOptionType').default;
        return {
            optionType: {
                relation: Model.BelongsToOneRelation,
                modelClass: ProductOptionType,
                join: { from: 'product_option_values.option_type_id', to: 'product_option_types.id' },
            },
        };
    }
}
