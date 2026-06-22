import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();

const OWNER_EMAIL  = 'import-owner@example.com';
const VIEWER_EMAIL = 'import-viewer@example.com';
const PASS = 'TestPass123!';

let viewerRoleId: string;

async function login(email: string) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password: PASS, recaptchaToken: 'test' });
    return s;
}

function csvBuffer(content: string) {
    return Buffer.from(content.trim(), 'utf-8');
}

const TEST_PRODUCT_NAMES = ['Import Dress', 'Import Shirt', 'Import Valid', 'Import Bad Price'];

async function cleanupTestProducts() {
    const products = await knex('products').whereIn('name', TEST_PRODUCT_NAMES).select('id');
    const productIds = products.map((p: any) => p.id);
    if (productIds.length === 0) return;

    const variants = await knex('product_variants').whereIn('product_id', productIds).select('id');
    const variantIds = variants.map((v: any) => v.id);
    if (variantIds.length > 0) {
        await knex('variant_option_values').whereIn('variant_id', variantIds).delete();
    }
    await knex('product_variants').whereIn('product_id', productIds).delete();

    const optionTypes = await knex('product_option_types').whereIn('product_id', productIds).select('id');
    const typeIds = optionTypes.map((t: any) => t.id);
    if (typeIds.length > 0) {
        await knex('product_option_values').whereIn('option_type_id', typeIds).delete();
        await knex('product_option_types').whereIn('id', typeIds).delete();
    }
    await knex('products').whereIn('id', productIds).delete();
}

const VALID_CSV = `
product_name,category,brand,description,size,colour,style,cost_price,selling_price,stock,low_stock_threshold,sku
Import Dress,Ladies Clothing,TestBrand,A test dress,M,Red,Regular,60,120,5,3,IMP-DRESS-M-RED
Import Dress,Ladies Clothing,TestBrand,A test dress,L,Blue,,70,130,3,2,IMP-DRESS-L-BLUE
Import Shirt,Mens Clothing,,,S,White,,50,100,10,,
`.trim();

const PARTIAL_ERROR_CSV = `
product_name,category,brand,description,size,colour,style,cost_price,selling_price,stock,low_stock_threshold,sku
Import Valid,Ladies Clothing,,,S,Black,,40,80,2,,IMP-VALID-S-BLK
,Ladies Clothing,,,M,Red,,60,120,5,,
Import Bad Price,Ladies Clothing,,,L,Blue,,abc,120,5,,
`.trim();

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);

    await cleanupTestProducts();
    await cleanupUsersByEmailLike('import-%@example.com');
    await knex('roles').where('name', 'like', 'Import Test%').delete();

    const [canView] = await knex('permissions').select('id').where({ name: 'products.view' });

    const [viewerRole] = await knex('roles').insert({ name: 'Import Test Viewer' }).returning('id');
    viewerRoleId = viewerRole.id;
    await knex('role_permissions').insert({ role_id: viewerRoleId, permission_id: canView.id });

    await createTestUser({ email: OWNER_EMAIL,  password: PASS, is_owner: true });
    await createTestUser({ email: VIEWER_EMAIL, password: PASS });
    await knex('users').where({ email: VIEWER_EMAIL }).update({ role_id: viewerRoleId });
});

afterAll(async () => {
    await cleanupTestProducts();
    await cleanupUsersByEmailLike('import-%@example.com');
    await knex('roles').where('name', 'like', 'Import Test%').delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

// ─── POST /api/products/import ────────────────────────────────────────────────

describe('POST /api/products/import', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app)
            .post('/api/products/import')
            .attach('file', csvBuffer(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_create_products', async () => {
        const s = await login(VIEWER_EMAIL);
        const res = await s
            .post('/api/products/import')
            .attach('file', csvBuffer(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' });
        expect(res.status).toBe(403);
    });

    it('returns 422 when no file is provided', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/products/import').send();
        expect(res.status).toBe(422);
    });

    it('returns 200 and processes a valid CSV', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s
            .post('/api/products/import')
            .attach('file', csvBuffer(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' });
        expect(res.status).toBe(200);
        expect(res.body.data.productsCreated).toBe(2);
        expect(res.body.data.variantsCreated).toBe(3);
        expect(res.body.data.skipped).toBe(0);
        expect(res.body.data.errors).toHaveLength(0);
    });

    it('creates the products and variants in the database', async () => {
        const dress = await knex('products').where({ name: 'Import Dress', category: 'Ladies Clothing' }).first();
        expect(dress).toBeDefined();

        const dressvariants = await knex('product_variants').where({ product_id: dress.id });
        expect(dressvariants).toHaveLength(2);

        const shirt = await knex('products').where({ name: 'Import Shirt', category: 'Mens Clothing' }).first();
        expect(shirt).toBeDefined();

        const shirtVariants = await knex('product_variants').where({ product_id: shirt.id });
        expect(shirtVariants).toHaveLength(1);
        expect(Number(shirtVariants[0].stock)).toBe(10);
        expect(Number(shirtVariants[0].selling_price)).toBe(100);
    });

    it('does not duplicate a product when re-importing the same product_name + category', async () => {
        const s = await login(OWNER_EMAIL);
        const singleRow = `product_name,category,brand,description,size,colour,style,cost_price,selling_price,stock,low_stock_threshold,sku\nImport Dress,Ladies Clothing,,,XL,Green,,80,150,2,,IMP-DRESS-XL-GRN`;
        await s
            .post('/api/products/import')
            .attach('file', csvBuffer(singleRow), { filename: 'import.csv', contentType: 'text/csv' });

        const count = await knex('products').where({ name: 'Import Dress', category: 'Ladies Clothing' }).count('id as n').first();
        expect(Number(count?.n)).toBe(1);

        const dress = await knex('products').where({ name: 'Import Dress', category: 'Ladies Clothing' }).first();
        const variants = await knex('product_variants').where({ product_id: dress.id });
        expect(variants).toHaveLength(3);
    });

    it('returns 200 with partial errors and still processes valid rows', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s
            .post('/api/products/import')
            .attach('file', csvBuffer(PARTIAL_ERROR_CSV), { filename: 'import.csv', contentType: 'text/csv' });
        expect(res.status).toBe(200);
        expect(res.body.data.variantsCreated).toBe(1);
        expect(res.body.data.skipped).toBe(2);
        expect(res.body.data.errors).toHaveLength(2);
        expect(res.body.data.errors[0].row).toBe(3);
        expect(res.body.data.errors[1].row).toBe(4);
    });

    it('returns 200 with zero counts for an empty CSV', async () => {
        const s = await login(OWNER_EMAIL);
        const emptyHeaders = 'product_name,category,brand,description,size,colour,style,cost_price,selling_price,stock,low_stock_threshold,sku';
        const res = await s
            .post('/api/products/import')
            .attach('file', csvBuffer(emptyHeaders), { filename: 'import.csv', contentType: 'text/csv' });
        expect(res.status).toBe(200);
        expect(res.body.data.productsCreated).toBe(0);
        expect(res.body.data.variantsCreated).toBe(0);
    });
});
