import fs from 'fs';
import multer from 'multer';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB        = Number(process.env.MAX_IMAGE_SIZE ?? 5);
const MAX_DIMENSION = 1200;
const JPEG_QUALITY  = 85;
const WEBP_QUALITY  = 85;

// Module-level singleton — avoids reconstructing the client on every upload call
const s3 = new S3Client({
    region:      process.env.AWS_S3_REGION ?? 'auto',
    endpoint:    process.env.AWS_ENDPOINT_URL,
    credentials: {
        accessKeyId:     process.env.AWS_S3_KEY ?? '',
        secretAccessKey: process.env.AWS_S3_SECRET ?? '',
    },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(Object.assign(new Error('Only JPEG, PNG, and WebP images are allowed.'), { status: 400 }));
    }
}

async function resizeBuffer(
    buffer: Buffer,
    mimetype: string,
): Promise<{ buffer: Buffer; mimetype: string }> {
    const image = sharp(buffer).rotate(); // auto-corrects EXIF orientation
    const { width = 0, height = 0 } = await image.metadata();

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        image.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true });
    }

    if (mimetype === 'image/webp') {
        return { buffer: await image.webp({ quality: WEBP_QUALITY }).toBuffer(), mimetype: 'image/webp' };
    }
    return { buffer: await image.jpeg({ quality: JPEG_QUALITY }).toBuffer(), mimetype: 'image/jpeg' };
}

export async function uploadBuffer(buffer: Buffer, originalname: string, mimetype: string): Promise<string> {
    const resized = await resizeBuffer(buffer, mimetype);
    const ext     = resized.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const key     = `products/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    await s3.send(new PutObjectCommand({
        Bucket:      process.env.AWS_S3_BUCKET ?? '',
        Key:         key,
        Body:        resized.buffer,
        ContentType: resized.mimetype,
    }));

    const publicBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
    if (publicBase) return `${publicBase}/${key}`;

    console.error('[S3] WARNING: R2_PUBLIC_URL is not set. Storing private API endpoint URL — image will not load in browser. Set R2_PUBLIC_URL in nodemon.json and restart.');
    const endpoint = (process.env.AWS_ENDPOINT_URL ?? '').replace(/\/$/, '');
    const bucket   = process.env.AWS_S3_BUCKET ?? '';
    return `${endpoint}/${bucket}/${key}`;
}

export async function deleteFromS3(imagePath: string): Promise<void> {
    // Legacy local paths from before S3 migration — clean up from disk and move on
    if (!imagePath.startsWith('http')) {
        await fs.promises.unlink(path.resolve(imagePath)).catch(() => undefined);
        return;
    }

    const publicBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
    const endpoint   = (process.env.AWS_ENDPOINT_URL ?? '').replace(/\/$/, '');
    const bucket     = process.env.AWS_S3_BUCKET ?? '';

    let key: string;
    if (publicBase && imagePath.startsWith(`${publicBase}/`)) {
        key = imagePath.slice(publicBase.length + 1);
    } else {
        const prefix = `${endpoint}/${bucket}/`;
        key = imagePath.startsWith(prefix)
            ? imagePath.slice(prefix.length)
            : new URL(imagePath).pathname.replace(`/${bucket}/`, '');
    }

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// Receives files into memory only — S3 upload happens explicitly in the service layer
export const uploadProductImages = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_MB * 1024 * 1024, files: 8 },
});
