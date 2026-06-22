import { Model } from 'objection';

export default class Message extends Model {
  static tableName = 'messages';

  id!: string;
  type!: 'email' | 'sms';
  destination!: string;
  subject?: string;
  content!: string;
  created_at!: string;
}
