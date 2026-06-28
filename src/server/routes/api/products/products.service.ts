import Product from '../../../models/Product';
import { categoryNameExists } from '../categories/categories.service';

function withRelations() {
    return Product.query()
        .withGraphFetched('[variants.[optionValues.optionType], images]')
        .modifyGraph('variants', (b) => b.orderBy('product_variants.created_at'))
        .modifyGraph('images', (b) => b.select('id', 'image_path', 'sort_order').orderBy('sort_order'));
}

export async function listProducts(
    page = 1,
    limit = 50,
    search = '',
    category = '',
): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const term   = search ? `%${search.toLowerCase()}%` : null;

    const applyFilters = (builder: any) => {
        if (term) {
            builder.where((b: any) =>
                b.whereRaw('LOWER(name) LIKE ?', [term])
                 .orWhereRaw('LOWER(brand) LIKE ?', [term])
            );
        }
        if (category) builder.where('category', category);
    };

    const [products, countResult] = await Promise.all([
        withRelations().modify(applyFilters).orderBy('name').offset(offset).limit(limit),
        Product.query().modify(applyFilters).count('id as count').first(),
    ]);
    return { products, total: Number((countResult as any)?.count ?? 0), page, limit };
}

export async function getProduct(id: string): Promise<Product> {
    const product = await withRelations().findById(id);
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });
    return product;
}

function invalidCategory() {
    return Object.assign(new Error('Invalid category. Please select a valid category.'), { status: 422, code: 'VALIDATION_ERROR' });
}

export async function createProduct(
    name: string,
    category: string,
    description: string | undefined,
    brand: string | undefined,
    createdBy: string,
): Promise<Product> {
    if (!(await categoryNameExists(category))) throw invalidCategory();
    return Product.query().insertAndFetch({ name, category, description, brand, created_by: createdBy, is_active: true });
}

export async function updateProduct(
    id: string,
    name: string,
    category: string,
    description: string | undefined,
    brand: string | undefined,
): Promise<{ product: Product; before: { name: string; category: string; description: string | undefined; brand: string | undefined } }> {
    const existing = await Product.query().findById(id);
    if (!existing) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!(await categoryNameExists(category))) throw invalidCategory();
    const product = (await Product.query().patchAndFetchById(id, { name, category, description, brand }))!;
    return { product, before: { name: existing.name, category: existing.category, description: existing.description, brand: existing.brand } };
}

export async function deactivateProduct(id: string): Promise<Product> {
    const product = await Product.query().patchAndFetchById(id, { is_active: false });
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });
    return product;
}

export async function activateProduct(id: string): Promise<Product> {
    const product = await Product.query().patchAndFetchById(id, { is_active: true });
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });
    return product;
}
