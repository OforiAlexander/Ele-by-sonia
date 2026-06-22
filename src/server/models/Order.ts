import { Model, RelationMappingsThunk } from 'objection';
import BaseModel from './_root';

// Phase 2
export default class Order extends BaseModel {
  static tableName = 'orders';

  static readonly STATUS_PENDING = 'pending';
  static readonly STATUS_CONFIRMED = 'confirmed';
  static readonly STATUS_PREPARING = 'preparing';
  static readonly STATUS_DISPATCHED = 'dispatched';
  static readonly STATUS_DELIVERED = 'delivered';
  static readonly STATUS_CANCELLED = 'cancelled';

  static readonly PAYMENT_STATUS_PENDING = 'pending';
  static readonly PAYMENT_STATUS_PAID = 'paid';
  static readonly PAYMENT_STATUS_FAILED = 'failed';

  id!: string;
  order_number!: string;
  customer_id!: string;
  status!: string;
  payment_status!: string;
  delivery_type!: 'delivery' | 'pickup';
  delivery_zone_id?: string;
  delivery_address?: string;
  delivery_fee!: number;
  handler_type?: 'owner' | 'courier';
  handler_name?: string;
  handler_phone?: string;
  subtotal!: number;
  total!: number;
  paystack_reference?: string;
  created_at!: string;
  updated_at?: string;

  items?: unknown[];
  customer?: unknown;
  deliveryZone?: unknown;

  static get relationMappings(): ReturnType<RelationMappingsThunk> {
    const OrderItem = require('./OrderItem').default;
    const Customer = require('./Customer').default;
    const DeliveryZone = require('./DeliveryZone').default;

    return {
      items: {
        relation: Model.HasManyRelation,
        modelClass: OrderItem,
        join: { from: 'orders.id', to: 'order_items.order_id' },
      },
      customer: {
        relation: Model.BelongsToOneRelation,
        modelClass: Customer,
        join: { from: 'orders.customer_id', to: 'customers.id' },
      },
      deliveryZone: {
        relation: Model.BelongsToOneRelation,
        modelClass: DeliveryZone,
        join: { from: 'orders.delivery_zone_id', to: 'delivery_zones.id' },
      },
    };
  }
}
