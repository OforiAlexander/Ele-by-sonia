import { Model, RelationMappingsThunk } from 'objection';

export default class Sale extends Model {
  static tableName = 'sales';

  static readonly PAYMENT_STATUS_PENDING = 'pending';
  static readonly PAYMENT_STATUS_PAID = 'paid';
  static readonly PAYMENT_STATUS_FAILED = 'failed';

  id!: string;
  sale_number!: string;
  staff_id!: string;
  payment_method!: 'cash' | 'momo';
  payment_status!: string;
  amount_due!: number;
  amount_tendered?: number;
  change_given?: number;
  discount!: number;
  note?: string;
  paystack_reference?: string;
  voided_at?: string;
  voided_by_id?: string;
  created_at!: string;

  items?: unknown[];
  staff?: unknown;

  static get relationMappings(): ReturnType<RelationMappingsThunk> {
    const SaleItem = require('./SaleItem').default;
    const User = require('./User').default;

    return {
      items: {
        relation: Model.HasManyRelation,
        modelClass: SaleItem,
        join: { from: 'sales.id', to: 'sale_items.sale_id' },
      },
      staff: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'sales.staff_id', to: 'users.id' },
      },
    };
  }
}
