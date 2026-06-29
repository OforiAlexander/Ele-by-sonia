import knex from '../../../models/_config';
import Product from '../../../models/Product';
import ProductVariant from '../../../models/ProductVariant';
import ProductOptionType from '../../../models/ProductOptionType';
import ProductOptionValue from '../../../models/ProductOptionValue';

function withOptionValues() {
    return ProductVariant.query()
        .withGraphFetched('optionValues.optionType')
        .modifyGraph('optionValues', (b) => b.orderBy('product_option_values.created_at'))
        .modifyGraph('optionValues.optionType', (b) => b.select('product_option_types.id', 'product_option_types.name'));
}

async function validateOptionValues(productId: string, optionValueIds: string[]): Promise<void> {
    if (optionValueIds.length === 0) return;

    const rows = await knex('product_option_values as pov')
        .join('product_option_types as pot', 'pot.id', 'pov.option_type_id')
        .whereIn('pov.id', optionValueIds)
        .select('pov.id', 'pot.id as type_id', 'pot.product_id');

    if (rows.length !== optionValueIds.length) {
        throw Object.assign(new Error('One or more option value IDs are invalid.'), { status: 400, code: 'VALIDATION_ERROR' });
    }

    for (const row of rows) {
        if (row.product_id !== productId) {
            throw Object.assign(new Error('All option values must belong to the specified product.'), { status: 400, code: 'VALIDATION_ERROR' });
        }
    }

    const typeIds = rows.map((r) => r.type_id);
    if (new Set(typeIds).size !== typeIds.length) {
        throw Object.assign(new Error('Cannot assign two values from the same option type to one variant.'), { status: 400, code: 'VALIDATION_ERROR' });
    }
}

export async function listOptionTypes(productId: string) {
    const product = await Product.query().findById(productId);
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });
    return ProductOptionType.query()
        .where({ product_id: productId })
        .withGraphFetched('values')
        .modifyGraph('values', (b) => b.orderBy('created_at'))
        .orderBy('created_at');
}

export async function createOptionType(productId: string, name: string) {
    const product = await Product.query().findById(productId);
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });

    const existing = await ProductOptionType.query().findOne({ product_id: productId, name });
    if (existing) throw Object.assign(new Error('An option type with that name already exists for this product.'), { status: 409, code: 'CONFLICT' });

    const type = await ProductOptionType.query().insertAndFetch({ product_id: productId, name });
    return Object.assign(type, { values: [] as ProductOptionValue[] });
}

export async function deleteOptionType(id: string) {
    const type = await ProductOptionType.query().findById(id).withGraphFetched('values');
    if (!type) throw Object.assign(new Error('Option type not found.'), { status: 404, code: 'NOT_FOUND' });

    const valueIds = (type.values ?? []).map((v) => v.id);
    if (valueIds.length > 0) {
        const inUse = await knex('variant_option_values').whereIn('option_value_id', valueIds).first();
        if (inUse) throw Object.assign(new Error('Cannot delete option type while its values are in use by variants.'), { status: 400, code: 'IN_USE' });
    }

    await ProductOptionType.query().deleteById(id);
}

export async function addOptionValue(optionTypeId: string, value: string): Promise<ProductOptionValue> {
    const type = await ProductOptionType.query().findById(optionTypeId);
    if (!type) throw Object.assign(new Error('Option type not found.'), { status: 404, code: 'NOT_FOUND' });

    const existing = await ProductOptionValue.query().findOne({ option_type_id: optionTypeId, value });
    if (existing) throw Object.assign(new Error('That value already exists for this option type.'), { status: 409, code: 'CONFLICT' });

    return ProductOptionValue.query().insertAndFetch({ option_type_id: optionTypeId, value });
}

export async function deleteOptionValue(id: string) {
    const value = await ProductOptionValue.query().findById(id);
    if (!value) throw Object.assign(new Error('Option value not found.'), { status: 404, code: 'NOT_FOUND' });

    const inUse = await knex('variant_option_values').where({ option_value_id: id }).first();
    if (inUse) throw Object.assign(new Error('Cannot delete option value while it is in use by variants.'), { status: 400, code: 'IN_USE' });

    await ProductOptionValue.query().deleteById(id);
}

export async function listVariants(productId: string) {
    const product = await Product.query().findById(productId);
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });
    return withOptionValues().where({ product_id: productId }).orderBy('product_variants.created_at');
}

export async function getVariant(id: string) {
    const variant = await withOptionValues().findById(id);
    if (!variant) throw Object.assign(new Error('Variant not found.'), { status: 404, code: 'NOT_FOUND' });
    return variant;
}

export async function searchVariants(
    q: string | undefined,
    inStockOnly: boolean,
    activeOnly: boolean,
    limit: number,
) {
    let idQuery = knex('product_variants as pv')
        .join('products as p', 'p.id', 'pv.product_id')
        .select('pv.id', 'p.name as product_name')
        .orderBy('p.name')
        .limit(limit);

    if (q) {
        const term = `%${q}%`;
        idQuery = idQuery.where((b) => {
            b.whereILike('pv.sku', term).orWhereILike('p.name', term);
        });
    }
    if (activeOnly) idQuery = idQuery.where('pv.is_active', true);
    if (inStockOnly) idQuery = idQuery.where('pv.stock', '>', 0);

    const rows: Array<{ id: string; product_name: string }> = await idQuery;
    if (rows.length === 0) return [];

    const productNameMap = new Map(rows.map((r) => [r.id, r.product_name]));
    const ids = rows.map((r) => r.id);

    const optionRows = await knex('variant_option_values as vov')
        .join('product_option_values as pov', 'pov.id', 'vov.option_value_id')
        .join('product_option_types as pot', 'pot.id', 'pov.option_type_id')
        .whereIn('vov.variant_id', ids)
        .select('vov.variant_id', 'pov.id', 'pov.value', 'pot.id as type_id', 'pot.name as type_name');

    interface OptionValueEntry { id: string; value: string; optionType: { id: string; name: string } }
    const valuesByVariant = new Map<string, OptionValueEntry[]>();
    for (const row of optionRows) {
        if (!valuesByVariant.has(row.variant_id)) valuesByVariant.set(row.variant_id, []);
        valuesByVariant.get(row.variant_id)!.push({
            id: row.id,
            value: row.value,
            optionType: { id: row.type_id, name: row.type_name },
        });
    }

    interface RawVariantRow {
        id: string; product_id: string; sku: string | null;
        cost_price: string; selling_price: string;
        stock: number; low_stock_threshold: number;
        is_active: boolean; created_at: string;
    }
    const variants: RawVariantRow[] = await knex('product_variants').whereIn('id', ids).select('*');

    return variants.map((v) => ({
        id: v.id,
        product_id: v.product_id,
        product_name: productNameMap.get(v.id) ?? '',
        sku: v.sku ?? null,
        cost_price: String(v.cost_price),
        selling_price: String(v.selling_price),
        stock: Number(v.stock),
        low_stock_threshold: Number(v.low_stock_threshold),
        is_active: v.is_active,
        created_at: v.created_at,
        optionValues: valuesByVariant.get(v.id) ?? [],
    }));
}

export async function createVariant(
    productId: string,
    costPrice: number,
    sellingPrice: number,
    optionValueIds: string[],
    lowStockThreshold: number | undefined,
    sku: string | undefined,
) {
    const product = await Product.query().findById(productId);
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404, code: 'NOT_FOUND' });

    await validateOptionValues(productId, optionValueIds);

    const insert: Record<string, unknown> = {
        product_id: productId,
        cost_price: costPrice,
        selling_price: sellingPrice,
        low_stock_threshold: lowStockThreshold ?? 5,
        stock: 0,
        is_active: true,
    };
    if (sku) insert.sku = sku;

    const variantId = await knex.transaction(async (trx) => {
        if (sku) {
            const duplicate = await trx('product_variants').where({ sku }).first();
            if (duplicate) throw Object.assign(new Error('A variant with that SKU already exists.'), { status: 409, code: 'CONFLICT' });
        }

        const [{ id }] = await trx('product_variants').insert(insert).returning('id');
        if (optionValueIds.length > 0) {
            await trx('variant_option_values').insert(
                optionValueIds.map((ovId) => ({ variant_id: id, option_value_id: ovId })),
            );
        }
        return id;
    });

    return (await withOptionValues().findById(variantId))!;
}

export async function updateVariant(
    id: string,
    costPrice: number,
    sellingPrice: number,
    optionValueIds: string[],
    lowStockThreshold: number | undefined,
    sku: string | undefined,
    isActive: boolean | undefined,
): Promise<{ variant: ProductVariant; before: { cost_price: number; selling_price: number; sku: string | undefined; is_active: boolean } }> {
    const check = await ProductVariant.query().findById(id);
    if (!check) throw Object.assign(new Error('Variant not found.'), { status: 404, code: 'NOT_FOUND' });

    await validateOptionValues(check.product_id, optionValueIds);

    let before!: { cost_price: number; selling_price: number; sku: string | undefined; is_active: boolean };

    await knex.transaction(async (trx) => {
        const existing = await trx('product_variants').where({ id }).forUpdate().first();
        if (!existing) throw Object.assign(new Error('Variant not found.'), { status: 404, code: 'NOT_FOUND' });

        before = {
            cost_price: Number(existing.cost_price),
            selling_price: Number(existing.selling_price),
            sku: existing.sku ?? undefined,
            is_active: existing.is_active,
        };

        if (sku && sku !== existing.sku) {
            const duplicate = await trx('product_variants').whereNot({ id }).where({ sku }).first();
            if (duplicate) throw Object.assign(new Error('A variant with that SKU already exists.'), { status: 409, code: 'CONFLICT' });
        }

        const patch: Record<string, unknown> = {
            cost_price: costPrice,
            selling_price: sellingPrice,
            low_stock_threshold: lowStockThreshold ?? existing.low_stock_threshold,
            is_active: isActive ?? existing.is_active,
        };
        if (sku !== undefined) patch.sku = sku;

        await trx('product_variants').where({ id }).update(patch);
        await trx('variant_option_values').where({ variant_id: id }).delete();
        if (optionValueIds.length > 0) {
            await trx('variant_option_values').insert(
                optionValueIds.map((ovId) => ({ variant_id: id, option_value_id: ovId })),
            );
        }
    });

    const variant = (await withOptionValues().findById(id))!;
    return { variant, before };
}

export async function setVariantStatus(
    id: string,
    isActive: boolean,
): Promise<{ variant: ProductVariant; before: boolean }> {
    const existing = await ProductVariant.query().findById(id);
    if (!existing) throw Object.assign(new Error('Variant not found.'), { status: 404, code: 'NOT_FOUND' });
    const variant = (await ProductVariant.query().patchAndFetchById(id, { is_active: isActive }))!;
    return { variant, before: existing.is_active };
}

export async function deleteVariant(id: string): Promise<ProductVariant> {
    const variant = await ProductVariant.query().findById(id);
    if (!variant) throw Object.assign(new Error('Variant not found.'), { status: 404, code: 'NOT_FOUND' });

    if (variant.stock > 0) {
        throw Object.assign(
            new Error(`Cannot delete a variant with remaining stock (${variant.stock} units). Adjust stock to zero first.`),
            { status: 400, code: 'STOCK_REMAINING' },
        );
    }

    const inSale = await knex('sale_items').where({ variant_id: id }).first();
    if (inSale) {
        throw Object.assign(
            new Error('Cannot delete a variant that has been sold. Deactivate it instead.'),
            { status: 409, code: 'IN_USE' },
        );
    }

    await knex.transaction(async (trx) => {
        await trx('stock_entries').where({ variant_id: id }).delete();
        await trx('product_variants').where({ id }).delete();
    });

    return variant;
}
