import { parse } from 'csv-parse/sync';
import PDFDocument from 'pdfkit';
import { Knex } from 'knex';
import knex from '../../../models/_config';
import Product from '../../../models/Product';
import { ensureLoaded, get } from '../../../startup/settingsCache';
import { SETTINGS } from '../../../constants/settings';
import { sendMail } from '../../../services/mail/send-mail';
import logger from '../../../services/logger';

const CSV_HEADERS = [
    'product_name', 'category', 'brand', 'description', 'sku',
    'cost_price', 'selling_price', 'stock', 'low_stock_threshold',
    'option_1_name', 'option_1_value',
    'option_2_name', 'option_2_value',
    'option_3_name', 'option_3_value',
] as const;

const REQUIRED_HEADERS = ['product_name', 'category', 'cost_price', 'selling_price', 'stock'] as const;

interface CsvRow {
    product_name:       string;
    category:           string;
    brand?:             string;
    description?:       string;
    sku?:               string;
    cost_price:         string;
    selling_price:      string;
    stock:              string;
    low_stock_threshold?: string;
    option_1_name?:     string;
    option_1_value?:    string;
    option_2_name?:     string;
    option_2_value?:    string;
    option_3_name?:     string;
    option_3_value?:    string;
}

export interface ImportResult {
    productsCreated: number;
    variantsCreated: number;
    skipped:         number;
    errors:          number;
    errorDetails:    Array<{ row: number; product_name: string; reason: string }>;
    skippedDetails:  Array<{ row: number; product_name: string; reason: string }>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function variantFingerprint(row: CsvRow): string {
    const pairs: Array<[string, string]> = [];
    for (let i = 1; i <= 3; i++) {
        const name  = (row[`option_${i}_name`  as keyof CsvRow] ?? '').trim();
        const value = (row[`option_${i}_value` as keyof CsvRow] ?? '').trim();
        if (name && value) pairs.push([name.toLowerCase(), value.toLowerCase()]);
    }
    if (pairs.length === 0) return '__no_options__';
    return pairs
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([n, v]) => `${n}:${v}`)
        .join('|');
}

async function ensureOptionValue(
    trx: Knex.Transaction,
    productId: string,
    typeName: string,
    valueStr: string,
): Promise<string> {
    let type = await trx('product_option_types').where({ product_id: productId, name: typeName }).first();
    if (!type) {
        [type] = await trx('product_option_types')
            .insert({ product_id: productId, name: typeName })
            .returning('*');
    }
    let value = await trx('product_option_values').where({ option_type_id: type.id, value: valueStr }).first();
    if (!value) {
        [value] = await trx('product_option_values')
            .insert({ option_type_id: type.id, value: valueStr })
            .returning('*');
    }
    return value.id;
}

// ── PDF builder ───────────────────────────────────────────────────────────────

function buildPdfReport(
    businessName: string,
    totalRows: number,
    result: ImportResult,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc    = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end',  ()         => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const now = new Date().toLocaleString('en-GH', {
            timeZone: 'Africa/Accra',
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        doc.fontSize(18).font('Helvetica-Bold')
            .text(`Bulk Import Report — ${businessName}`, { align: 'left' });
        doc.fontSize(11).font('Helvetica').fillColor('#666')
            .text(`Generated: ${now}`, { align: 'left' });
        doc.moveDown(1.2);

        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a1a').text('Summary');
        doc.moveDown(0.4);

        const summaryRows: Array<[string, string | number]> = [
            ['Total rows in file',    totalRows],
            ['Products created',      result.productsCreated],
            ['Variants created',      result.variantsCreated],
            ['Duplicates skipped',    result.skipped],
            ['Errors',                result.errors],
        ];

        for (const [label, value] of summaryRows) {
            doc.fontSize(11).font('Helvetica').fillColor('#333')
                .text(`${label}:`, { continued: true, width: 220 })
                .font('Helvetica-Bold').fillColor('#1a1a1a')
                .text(`  ${value}`);
        }

        if (result.errors === 0 && result.skipped === 0) {
            doc.moveDown(1.5);
            doc.fontSize(12).font('Helvetica').fillColor('#2d8653')
                .text('All rows imported successfully.', { align: 'center' });
        }

        if (result.errorDetails.length > 0) {
            doc.moveDown(1.5);
            doc.fontSize(13).font('Helvetica-Bold').fillColor('#c0392b').text('Errors');
            doc.moveDown(0.5);
            renderTable(doc, ['Row #', 'Product Name', 'Reason'], result.errorDetails.map((e) => [
                String(e.row), e.product_name, e.reason,
            ]));
        }

        if (result.skippedDetails.length > 0) {
            doc.moveDown(1.5);
            doc.fontSize(13).font('Helvetica-Bold').fillColor('#856404').text('Skipped (Duplicates)');
            doc.moveDown(0.5);
            renderTable(doc, ['Row #', 'Product Name', 'Reason'], result.skippedDetails.map((s) => [
                String(s.row), s.product_name, s.reason,
            ]));
        }

        doc.end();
    });
}

function renderTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]): void {
    const colWidths = [50, 180, 260];
    const rowH      = 20;
    const startX    = doc.page.margins.left;
    let   y         = doc.y;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#555');
    headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x, y, { width: colWidths[i], lineBreak: false });
    });
    y += rowH;
    doc.moveTo(startX, y - 2).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 2)
        .strokeColor('#ccc').stroke();

    doc.fontSize(10).font('Helvetica').fillColor('#1a1a1a');
    for (const row of rows) {
        if (y > doc.page.height - doc.page.margins.bottom - rowH) {
            doc.addPage();
            y = doc.page.margins.top;
        }
        row.forEach((cell, i) => {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.text(cell, x, y, { width: colWidths[i], lineBreak: false });
        });
        y += rowH;
    }
    doc.y = y;
}

// ── public API ────────────────────────────────────────────────────────────────

export async function importFromCsv(buffer: Buffer, createdBy: string): Promise<ImportResult> {
    await ensureLoaded();

    const records: CsvRow[] = parse(buffer, {
        columns:           true,
        skip_empty_lines:  true,
        trim:              true,
    });

    // ── Phase 1a: required headers check ─────────────────────────────────────
    if (records.length > 0) {
        const presentHeaders = Object.keys(records[0]);
        const missingHeaders = REQUIRED_HEADERS.filter((h) => !presentHeaders.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`CSV is missing required columns: ${missingHeaders.join(', ')}`);
        }
    }

    const errorDetails:   ImportResult['errorDetails']   = [];
    const skippedDetails: ImportResult['skippedDetails'] = [];

    // ── Phase 1b: per-row field validation ───────────────────────────────────
    const seenSkusInFile = new Map<string, number>();
    const validRows: Array<{ row: CsvRow; rowNum: number }> = [];

    for (let i = 0; i < records.length; i++) {
        const row    = records[i];
        const rowNum = i + 2;
        const name   = row.product_name?.trim() ?? '';

        const fieldError = (reason: string): void => {
            errorDetails.push({ row: rowNum, product_name: name || '(blank)', reason });
        };

        let hasError = false;
        const mark = (reason: string) => { fieldError(reason); hasError = true; };

        if (!name)                                                         mark('product_name is required');
        if (!row.category?.trim())                                         mark('category is required');

        const cost    = Number(row.cost_price);
        const selling = Number(row.selling_price);
        const stock   = Number(row.stock);

        if (!row.cost_price || isNaN(cost) || cost < 0)                   mark('cost_price must be a non-negative number');
        if (!row.selling_price || isNaN(selling) || selling < 0)          mark('selling_price must be a non-negative number');
        if (row.stock === undefined || row.stock === '' || isNaN(stock) || stock < 0 || !Number.isInteger(stock))
                                                                           mark('stock must be a non-negative integer');

        if (row.low_stock_threshold !== undefined && row.low_stock_threshold !== '') {
            const thr = Number(row.low_stock_threshold);
            if (isNaN(thr) || thr < 0 || !Number.isInteger(thr))         mark('low_stock_threshold must be a non-negative integer');
        }

        const sku = row.sku?.trim();
        if (sku) {
            if (seenSkusInFile.has(sku)) {
                mark(`Duplicate SKU "${sku}" in file (first seen at row ${seenSkusInFile.get(sku)})`);
            } else {
                seenSkusInFile.set(sku, rowNum);
            }
        }

        if (!hasError) validRows.push({ row, rowNum });
    }

    // ── Phase 1c: batch DB checks ─────────────────────────────────────────────
    const categoryNames = [...new Set(validRows.map((r) => r.row.category.trim()))];
    const skusToCheck   = validRows.map((r) => r.row.sku?.trim()).filter((s): s is string => !!s);

    const [dbCategories, dbSkuRows] = await Promise.all([
        categoryNames.length > 0
            ? knex('categories').whereIn('name', categoryNames).select('name')
            : Promise.resolve([] as Array<{ name: string }>),
        skusToCheck.length > 0
            ? knex('product_variants').whereIn('sku', skusToCheck).select('sku')
            : Promise.resolve([] as Array<{ sku: string }>),
    ]);

    const validCategorySet = new Set(dbCategories.map((r: { name: string }) => r.name));
    const existingSkuSet   = new Set(dbSkuRows.map((r: { sku: string }) => r.sku));

    const phaseOneValid: Array<{ row: CsvRow; rowNum: number }> = [];
    for (const { row, rowNum } of validRows) {
        const name = row.product_name.trim();
        let hasError = false;

        if (!validCategorySet.has(row.category.trim())) {
            errorDetails.push({ row: rowNum, product_name: name, reason: `Category "${row.category.trim()}" does not exist` });
            hasError = true;
        }

        const sku = row.sku?.trim();
        if (sku && existingSkuSet.has(sku)) {
            errorDetails.push({ row: rowNum, product_name: name, reason: `SKU "${sku}" already exists in the database` });
            hasError = true;
        }

        if (!hasError) phaseOneValid.push({ row, rowNum });
    }

    // ── Phase 2: deduplication ────────────────────────────────────────────────
    type GroupKey = string;
    const groups = new Map<GroupKey, Array<{ row: CsvRow; rowNum: number }>>();

    for (const entry of phaseOneValid) {
        const key: GroupKey = `${entry.row.product_name.trim().toLowerCase()}|${entry.row.category.trim()}`;
        const group = groups.get(key) ?? [];
        group.push(entry);
        groups.set(key, group);
    }

    interface InsertPlan {
        row:    CsvRow;
        rowNum: number;
        productKey: GroupKey;
        normalizedName: string;
        category: string;
    }

    const insertPlans: InsertPlan[] = [];

    for (const [key, entries] of groups) {
        const firstRow      = entries[0].row;
        const normalizedName = firstRow.product_name.trim().toLowerCase();
        const category       = firstRow.category.trim();

        const existingProduct = await Product.query()
            .whereRaw('LOWER(name) = ?', [normalizedName])
            .where({ category })
            .first();

        const seenFingerprints = new Set<string>();

        if (existingProduct) {
            const existingVariants = await knex('product_variants')
                .where({ product_id: existingProduct.id })
                .select('id');

            for (const variant of existingVariants) {
                const optionValues = await knex('variant_option_values as vov')
                    .join('product_option_values as pov', 'pov.id', 'vov.option_value_id')
                    .join('product_option_types as pot', 'pot.id', 'pov.option_type_id')
                    .where('vov.variant_id', variant.id)
                    .select('pot.name as type_name', 'pov.value');

                if (optionValues.length === 0) {
                    seenFingerprints.add('__no_options__');
                } else {
                    const fp = optionValues
                        .map((ov: { type_name: string; value: string }) => [ov.type_name.toLowerCase(), ov.value.toLowerCase()] as [string, string])
                        .sort(([a]: [string, string], [b]: [string, string]) => a.localeCompare(b))
                        .map(([n, v]: [string, string]) => `${n}:${v}`)
                        .join('|');
                    seenFingerprints.add(fp);
                }
            }
        }

        for (const { row, rowNum } of entries) {
            const fp = variantFingerprint(row);
            if (seenFingerprints.has(fp)) {
                skippedDetails.push({
                    row:          rowNum,
                    product_name: row.product_name.trim(),
                    reason:       seenFingerprints.size > 0 && existingProduct
                        ? 'Variant already exists'
                        : 'Duplicate variant in file',
                });
            } else {
                seenFingerprints.add(fp);
                insertPlans.push({ row, rowNum, productKey: key, normalizedName, category });
            }
        }
    }

    // ── Phase 3: commit all inserts ───────────────────────────────────────────
    let productsCreated = 0;
    let variantsCreated = 0;

    const productIdByKey = new Map<GroupKey, string>();

    await knex.transaction(async (trx) => {
        for (const plan of insertPlans) {
            let productId = productIdByKey.get(plan.productKey);

            if (!productId) {
                const existingProduct = await trx('products')
                    .whereRaw('LOWER(name) = ?', [plan.normalizedName])
                    .where({ category: plan.category })
                    .first();

                if (existingProduct) {
                    productId = existingProduct.id;
                } else {
                    const firstRow = plan.row;
                    const [inserted] = await trx('products').insert({
                        name:        firstRow.product_name.trim(),
                        category:    plan.category,
                        brand:       firstRow.brand?.trim() || null,
                        description: firstRow.description?.trim() || null,
                        created_by:  createdBy,
                        is_active:   true,
                    }).returning('id');
                    productId = inserted.id;
                    productsCreated++;
                }
                productIdByKey.set(plan.productKey, productId!);
            }

            const row       = plan.row;
            const threshold = row.low_stock_threshold !== undefined && row.low_stock_threshold !== ''
                ? Number(row.low_stock_threshold)
                : 5;

            const [inserted] = await trx('product_variants').insert({
                product_id:          productId,
                cost_price:          Number(row.cost_price),
                selling_price:       Number(row.selling_price),
                stock:               Number(row.stock),
                low_stock_threshold: threshold,
                sku:                 row.sku?.trim() || null,
                is_active:           true,
            }).returning('id');

            const variantId = inserted.id;
            variantsCreated++;

            for (let i = 1; i <= 3; i++) {
                const optName  = (row[`option_${i}_name`  as keyof CsvRow] ?? '').trim();
                const optValue = (row[`option_${i}_value` as keyof CsvRow] ?? '').trim();
                if (optName && optValue) {
                    const optValueId = await ensureOptionValue(trx, productId!, optName, optValue);
                    await trx('variant_option_values').insert({ variant_id: variantId, option_value_id: optValueId });
                }
            }
        }
    });

    const result: ImportResult = {
        productsCreated,
        variantsCreated,
        skipped:       skippedDetails.length,
        errors:        errorDetails.length,
        errorDetails,
        skippedDetails,
    };

    // ── fire-and-forget: email PDF to owner ───────────────────────────────────
    const ownerEmail = process.env.OWNER_EMAIL;
    if (ownerEmail) {
        const businessName = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';
        buildPdfReport(businessName, records.length, result)
            .then((pdfBuffer) => sendMail({
                to:      ownerEmail,
                subject: `Bulk Import Report — ${businessName}`,
                html:    `<p>Please find the bulk import report attached. ${variantsCreated} variant(s) imported, ${errorDetails.length} error(s), ${skippedDetails.length} skipped.</p>`,
                attachments: [{
                    filename:    `import-report-${Date.now()}.pdf`,
                    content:     pdfBuffer,
                    contentType: 'application/pdf',
                }],
            }))
            .catch((err) => logger.error('[csv-import] Failed to email PDF report: %o', err));
    }

    return result;
}

export function buildCsvTemplate(): string {
    const header = CSV_HEADERS.join(',');
    const example1 = [
        'Summer Dress', 'Dresses', 'Zara', 'Floral summer dress', 'SKU-001',
        '80', '150', '20', '5',
        'Size', 'M', 'Colour', 'Red', '', '',
    ].join(',');
    const example2 = [
        'Summer Dress', 'Dresses', 'Zara', 'Floral summer dress', 'SKU-002',
        '80', '150', '15', '5',
        'Size', 'L', 'Colour', 'Blue', '', '',
    ].join(',');
    return [header, example1, example2].join('\n');
}
