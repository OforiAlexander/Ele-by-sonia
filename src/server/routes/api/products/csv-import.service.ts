import { parse } from 'csv-parse/sync';
import { Knex } from 'knex';
import knex from '../../../models/_config';
import Product from '../../../models/Product';

interface CsvRow {
    product_name: string;
    category: string;
    brand?: string;
    description?: string;
    size: string;
    colour: string;
    style?: string;
    cost_price: string;
    selling_price: string;
    stock: string;
    low_stock_threshold?: string;
    sku?: string;
}

export interface ImportResult {
    productsCreated: number;
    variantsCreated: number;
    skipped: number;
    errors: Array<{ row: number; reason: string }>;
}

async function ensureOptionValue(
    trx: Knex.Transaction,
    productId: string,
    typeName: string,
    valueStr: string,
): Promise<string> {
    let type = await trx('product_option_types').where({ product_id: productId, name: typeName }).first();
    if (!type) {
        [type] = await trx('product_option_types').insert({ product_id: productId, name: typeName }).returning('*');
    }
    let value = await trx('product_option_values').where({ option_type_id: type.id, value: valueStr }).first();
    if (!value) {
        [value] = await trx('product_option_values').insert({ option_type_id: type.id, value: valueStr }).returning('*');
    }
    return value.id;
}

export async function importFromCsv(buffer: Buffer, createdBy: string): Promise<ImportResult> {
    const records: CsvRow[] = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    const result: ImportResult = { productsCreated: 0, variantsCreated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2;

        try {
            const productName = row.product_name?.trim();
            const category    = row.category?.trim();
            const size        = row.size?.trim();
            const colour      = row.colour?.trim();
            const costPrice   = Number(row.cost_price);
            const sellingPrice = Number(row.selling_price);
            const stock       = Number(row.stock);
            const threshold   = row.low_stock_threshold ? Number(row.low_stock_threshold) : 5;
            const sku         = row.sku?.trim() || undefined;

            if (!productName)           throw new Error('product_name is required');
            if (!category)              throw new Error('category is required');
            if (!size)                  throw new Error('size is required');
            if (!colour)                throw new Error('colour is required');
            if (!row.cost_price || isNaN(costPrice) || costPrice < 0)     throw new Error('cost_price must be a non-negative number');
            if (!row.selling_price || isNaN(sellingPrice) || sellingPrice < 0) throw new Error('selling_price must be a non-negative number');
            if (row.stock === undefined || row.stock === '' || isNaN(stock) || stock < 0) throw new Error('stock must be a non-negative number');

            let product = await Product.query().findOne({ name: productName, category });
            let isNew = false;
            if (!product) {
                product = await Product.query().insertAndFetch({
                    name: productName,
                    category,
                    brand: row.brand?.trim() || undefined,
                    description: row.description?.trim() || undefined,
                    created_by: createdBy,
                    is_active: true,
                });
                isNew = true;
            }

            await knex.transaction(async (trx) => {
                const optionValueIds: string[] = [];
                optionValueIds.push(await ensureOptionValue(trx, product!.id, 'Size', size));
                optionValueIds.push(await ensureOptionValue(trx, product!.id, 'Colour', colour));
                if (row.style?.trim()) {
                    optionValueIds.push(await ensureOptionValue(trx, product!.id, 'Style', row.style.trim()));
                }

                const [{ id: variantId }] = await trx('product_variants').insert({
                    product_id: product!.id,
                    cost_price: costPrice,
                    selling_price: sellingPrice,
                    stock,
                    low_stock_threshold: isNaN(threshold) ? 5 : threshold,
                    sku: sku ?? null,
                    is_active: true,
                }).returning('id');

                if (optionValueIds.length > 0) {
                    await trx('variant_option_values').insert(
                        optionValueIds.map((ovId) => ({ variant_id: variantId, option_value_id: ovId })),
                    );
                }
            });

            if (isNew) result.productsCreated++;
            result.variantsCreated++;
        } catch (err) {
            result.errors.push({ row: rowNum, reason: (err as Error).message });
            result.skipped++;
        }
    }

    return result;
}
