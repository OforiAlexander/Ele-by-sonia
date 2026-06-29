import Category from '../../../models/Category';
import Product from '../../../models/Product';

function notFound() {
  return Object.assign(new Error('Category not found.'), { status: 404, code: 'NOT_FOUND' });
}

function nameTaken() {
  return Object.assign(new Error('A category with that name already exists.'), { status: 409, code: 'CONFLICT' });
}

export async function listCategories(): Promise<Category[]> {
  return Category.query().orderBy('name');
}

export async function getCategory(id: string): Promise<Category> {
  const cat = await Category.query().findById(id);
  if (!cat) throw notFound();
  return cat;
}

export async function createCategory(name: string): Promise<Category> {
  const existing = await Category.query().findOne({ name });
  if (existing) throw nameTaken();
  return Category.query().insertAndFetch({ name });
}

export async function updateCategory(id: string, name: string): Promise<{ category: Category; before: string }> {
  const existing = await Category.query().findById(id);
  if (!existing) throw notFound();
  const duplicate = await Category.query().findOne({ name }).whereNot({ id });
  if (duplicate) throw nameTaken();
  const category = (await Category.query().patchAndFetchById(id, { name }))!;
  return { category, before: existing.name };
}

export async function deleteCategory(id: string): Promise<Category> {
  const existing = await Category.query().findById(id);
  if (!existing) throw notFound();
  const inUse = await Product.query().findOne({ category: existing.name });
  if (inUse) {
    throw Object.assign(
      new Error('This category is used by one or more products and cannot be deleted.'),
      { status: 409, code: 'IN_USE' },
    );
  }
  await Category.query().deleteById(id);
  return existing;
}

export async function categoryNameExists(name: string): Promise<boolean> {
  const row = await Category.query().findOne({ name });
  return !!row;
}
