import { Model, QueryContext } from 'objection';

export default class BaseModel extends Model {
  updated_at?: string;

  $beforeUpdate(): void {
    this.updated_at = new Date().toISOString();
  }

  $afterFind(_queryContext: QueryContext): void {
    for (const key of Object.keys(this) as Array<keyof this>) {
      if ((this[key] as unknown) === null) {
        delete this[key];
      }
    }
  }
}
