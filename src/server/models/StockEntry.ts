import { Model, RelationMappingsThunk } from 'objection';

export default class StockEntry extends Model {
  static tableName = 'stock_entries';

  id!: string;
  variant_id!: string;
  quantity!: number;
  note?: string;
  created_by!: string;
  created_at!: string;

  createdByUser?: unknown;

  static get relationMappings(): ReturnType<RelationMappingsThunk> {
    const User = require('./User').default;

    return {
      createdByUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'stock_entries.created_by', to: 'users.id' },
      },
    };
  }
}
