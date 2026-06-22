import fs from 'fs';
import path from 'path';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import knex from '../../../models/_config';

function getImagePath(file: Express.Multer.File): string {
    return (file as any).location ?? file.path;
}

export async function addImages(productId: string, files: Express.Multer.File[]) {
    const row = await knex('product_images').where({ product_id: productId }).max('sort_order as max').first();
    const baseOrder = Number(row?.max ?? -1) + 1;

    await knex('product_images').insert(
        files.map((file, i) => ({
            product_id: productId,
            image_path: getImagePath(file),
            sort_order: baseOrder + i,
        })),
    );

    return knex('product_images').where({ product_id: productId }).orderBy('sort_order');
}

export async function removeImage(productId: string, imageId: string) {
    const image = await knex('product_images').where({ id: imageId, product_id: productId }).first();
    if (!image) throw Object.assign(new Error('Image not found.'), { status: 404, code: 'NOT_FOUND' });

    await knex('product_images').where({ id: imageId }).delete();
    void deleteFile(image.image_path);
    return image;
}

async function deleteFile(imagePath: string): Promise<void> {
    if (imagePath.startsWith('http')) {
        const url = new URL(imagePath);
        const key = url.pathname.slice(1);
        const s3 = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
            },
        });
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET ?? '', Key: key }));
    } else {
        await fs.promises.unlink(path.resolve(imagePath)).catch(() => undefined);
    }
}
