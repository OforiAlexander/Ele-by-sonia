import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';

const ALLOWED_MIME = ['image/jpeg', 'image/png'];
const MAX_MB = Number(process.env.MAX_IMAGE_SIZE ?? 5);

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG and PNG images are allowed.'), { status: 400 }));
  }
}

function localStorage() {
  return multer.diskStorage({
    destination: 'uploads/products',
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

function s3Storage() {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });

  return multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET ?? '',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req: Express.Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
      const ext = path.extname(file.originalname);
      cb(null, `products/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

export const uploadProductImages = multer({
  storage: process.env.NODE_ENV === 'production' ? s3Storage() : localStorage(),
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 8 },
});
