import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif)$/;

export const multerOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) =>
    ALLOWED_MIME.test(file.mimetype)
      ? cb(null, true)
      : cb(new BadRequestException('Accepted formats: JPEG, PNG, WebP or GIF (2 MB max)'), false),
};
