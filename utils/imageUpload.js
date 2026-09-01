import fs from 'fs/promises';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const checkFileType = (file, cb) => {
  const allowedExtensions = new Set(['.jpg', '.jpeg', '.png']);
  const allowedMimeTypes = new Set(['image/jpeg', 'image/png']);
  const extname = allowedExtensions.has(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedMimeTypes.has((file.mimetype || '').toLowerCase());

  if (extname && mimetype) return cb(null, true);

  const error = new Error('Images only!');
  error.statusCode = 400;
  return cb(error);
};

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
});

export const removeTemporaryUpload = async (file) => {
  if (!file?.path) return;

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Temporary upload cleanup failed: ${error.message}`);
    }
  }
};
