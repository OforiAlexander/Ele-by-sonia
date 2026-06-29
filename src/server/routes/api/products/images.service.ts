import knex from '../../../models/_config';
import { uploadBuffer, deleteFromS3 } from '../../../services/upload';

export async function addImages(productId: string, files: Express.Multer.File[]) {
    const row       = await knex('product_images').where({ product_id: productId }).max('sort_order as max').first();
    const baseOrder = Number(row?.max ?? -1) + 1;

    const results = await Promise.allSettled(
        files.map((file) => uploadBuffer(file.buffer, file.originalname, file.mimetype)),
    );

    const rows: { product_id: string; image_path: string; sort_order: number }[] = [];
    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            rows.push({ product_id: productId, image_path: result.value, sort_order: baseOrder + i });
        } else {
            console.error('[S3] Failed to upload image:', files[i]?.originalname, result.reason);
        }
    });

    if (rows.length > 0) {
        await knex('product_images').insert(rows);
    }

    return knex('product_images').where({ product_id: productId }).orderBy('sort_order');
}

export async function removeImage(productId: string, imageId: string) {
    const image = await knex('product_images').where({ id: imageId, product_id: productId }).first();
    if (!image) throw Object.assign(new Error('Image not found.'), { status: 404, code: 'NOT_FOUND' });

    await knex('product_images').where({ id: imageId }).delete();

    void deleteFromS3(image.image_path).catch((err) => {
        console.error('[S3] Failed to delete from S3:', image.image_path, err);
    });

    return image;
}
