import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import {
  imageUpload,
  removeTemporaryUpload,
} from '../utils/imageUpload.js';

const createUploadServer = async () => {
  const app = express();
  app.post('/upload', imageUpload.single('image'), async (req, res) => {
    const uploadedFile = req.file;
    await removeTemporaryUpload(uploadedFile);
    res.status(200).json({ uploaded: true, path: uploadedFile.path });
  });
  app.use((error, req, res, next) => {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(statusCode).json({ error: error.message });
  });

  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () =>
      resolve(listeningServer),
    );
  });

  return {
    url: `http://127.0.0.1:${server.address().port}/upload`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

const uploadFile = (url, content, type, filename) => {
  const form = new FormData();
  form.append('image', new Blob([content], { type }), filename);
  return fetch(url, { method: 'POST', body: form });
};

test('Cloudinary v2 exposes the upload methods used by the API', () => {
  assert.equal(typeof cloudinary.config, 'function');
  assert.equal(typeof cloudinary.uploader.upload, 'function');
  assert.equal(typeof cloudinary.uploader.destroy, 'function');
});

test('Multer 2 preserves image validation, size limits, and cleanup', async () => {
  const server = await createUploadServer();

  try {
    const validResponse = await uploadFile(
      server.url,
      new Uint8Array([0xff, 0xd8, 0xff]),
      'image/jpeg',
      'photo.jpg',
    );
    const validBody = await validResponse.json();
    assert.equal(validResponse.status, 200);
    assert.equal(validBody.uploaded, true);
    await assert.rejects(fs.access(validBody.path), { code: 'ENOENT' });

    const invalidResponse = await uploadFile(
      server.url,
      'not an image',
      'text/plain',
      'notes.txt',
    );
    assert.equal(invalidResponse.status, 400);
    assert.match((await invalidResponse.json()).error, /Images only/);

    const oversizedResponse = await uploadFile(
      server.url,
      new Uint8Array(5 * 1024 * 1024 + 1),
      'image/png',
      'large.png',
    );
    assert.equal(oversizedResponse.status, 413);
    assert.match((await oversizedResponse.json()).error, /File too large/);
  } finally {
    await server.close();
  }
});
