import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('products', (table) => {
        table.index('category', 'idx_products_category');
    });
    await knex.schema.table('product_images', (table) => {
        table.index('product_id', 'idx_product_images_product_id');
    });
    await knex.schema.table('product_variants', (table) => {
        table.index('product_id', 'idx_product_variants_product_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('products', (table) => {
        table.dropIndex('category', 'idx_products_category');
    });
    await knex.schema.table('product_images', (table) => {
        table.dropIndex('product_id', 'idx_product_images_product_id');
    });
    await knex.schema.table('product_variants', (table) => {
        table.dropIndex('product_id', 'idx_product_variants_product_id');
    });
}
