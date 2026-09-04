import test from 'node:test';
import assert from 'node:assert/strict';
import Memories from '../models/MemoriesModel.js';
import {
  deleteMemory,
  deleteMemoryImage,
} from '../controllers/MemoriesController.js';
import {
  deleteCloudinaryImage,
  replaceCloudinaryImage,
  uploadCloudinaryImage,
} from '../utils/cloudinaryImages.js';
import { v2 as cloudinary } from 'cloudinary';

const invokeHandler = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode: this.statusCode, body });
      },
    };

    handler(req, res, (error) => {
      if (error) reject(error);
    });
  });

test('Cloudinary cleanup skips records without an image identifier', async () => {
  let configured = false;
  let destroyed = false;
  const client = {
    config: () => {
      configured = true;
    },
    uploader: {
      destroy: async () => {
        destroyed = true;
      },
    },
  };

  assert.deepEqual(await deleteCloudinaryImage({}, client), {
    result: 'skipped',
  });
  assert.equal(configured, false);
  assert.equal(destroyed, false);
});

test('Cloudinary uploads use the shared configured client', async () => {
  const events = [];
  const client = {
    config: () => events.push('configured'),
    uploader: {
      upload: async (filePath) => {
        events.push(`uploaded:${filePath}`);
        return { public_id: 'new-image' };
      },
    },
  };

  assert.deepEqual(await uploadCloudinaryImage('temporary.jpg', client), {
    public_id: 'new-image',
  });
  assert.deepEqual(events, ['configured', 'uploaded:temporary.jpg']);
});

test('image replacement keeps the successful upload when old cleanup fails', async () => {
  const logged = [];
  const document = {
    cloudinaryId: 'old-image',
    memoryImage: 'https://example.com/old.jpg',
    save: async () => {},
  };
  const client = {
    config: () => {},
    uploader: {
      upload: async () => ({
        public_id: 'new-image',
        secure_url: 'https://example.com/new.jpg',
      }),
      destroy: async () => ({ result: 'failed' }),
    },
  };

  const result = await replaceCloudinaryImage({
    document,
    filePath: 'temporary.jpg',
    imageUrlField: 'memoryImage',
    client,
    logger: { error: (message) => logged.push(message) },
  });

  assert.equal(document.cloudinaryId, 'new-image');
  assert.equal(document.memoryImage, 'https://example.com/new.jpg');
  assert.equal(result.cleanupWarning, true);
  assert.equal(logged.length, 1);
});

test('image replacement removes a new upload when the database save fails', async () => {
  const destroyed = [];
  const document = {
    cloudinaryId: null,
    memoryImage: null,
    save: async () => {
      throw new Error('database unavailable');
    },
  };
  const client = {
    config: () => {},
    uploader: {
      upload: async () => ({
        public_id: 'new-image',
        secure_url: 'https://example.com/new.jpg',
      }),
      destroy: async (publicId) => {
        destroyed.push(publicId);
        return { result: 'ok' };
      },
    },
  };

  await assert.rejects(
    replaceCloudinaryImage({
      document,
      filePath: 'temporary.jpg',
      imageUrlField: 'memoryImage',
      client,
    }),
    /database unavailable/,
  );
  assert.deepEqual(destroyed, ['new-image']);
});

test('Cloudinary cleanup accepts deleted and already-absent images', async () => {
  const deletedIds = [];
  const client = {
    config: () => {},
    uploader: {
      destroy: async (publicId) => {
        deletedIds.push(publicId);
        return { result: publicId === 'existing-image' ? 'ok' : 'not found' };
      },
    },
  };

  await deleteCloudinaryImage({ publicId: 'existing-image' }, client);
  await deleteCloudinaryImage({ publicId: 'missing-image' }, client);

  assert.deepEqual(deletedIds, ['existing-image', 'missing-image']);
});

test('Cloudinary cleanup rejects an unsuccessful provider response', async () => {
  const client = {
    config: () => {},
    uploader: {
      destroy: async () => ({ result: 'failed' }),
    },
  };

  await assert.rejects(
    deleteCloudinaryImage({ publicId: 'image-id' }, client),
    /cleanup was not successful/,
  );
});

test('Cloudinary cleanup rejects an image URL without its cleanup identifier', async () => {
  await assert.rejects(
    deleteCloudinaryImage({ imageUrl: 'https://example.com/orphan-risk.jpg' }),
    /cleanup identifier is missing/,
  );
});

test('full Memory deletion removes its image before its database record', async () => {
  const originalFindOne = Memories.findOne;
  const originalDestroy = cloudinary.uploader.destroy;
  const events = [];

  Memories.findOne = async () => ({
    cloudinaryId: 'memory-image-id',
    memoryImage: 'https://example.com/image.jpg',
    deleteOne: async () => {
      events.push('memory deleted');
    },
  });
  cloudinary.uploader.destroy = async (publicId) => {
    events.push(`image deleted: ${publicId}`);
    return { result: 'ok' };
  };

  try {
    const response = await invokeHandler(deleteMemory, {
      params: { id: 'memory-id' },
      user: { _id: 'user-id' },
    });

    assert.deepEqual(events, [
      'image deleted: memory-image-id',
      'memory deleted',
    ]);
    assert.deepEqual(response, {
      statusCode: 200,
      body: { success: true },
    });
  } finally {
    Memories.findOne = originalFindOne;
    cloudinary.uploader.destroy = originalDestroy;
  }
});

test('full Memory deletion keeps its database record when image cleanup fails', async () => {
  const originalFindOne = Memories.findOne;
  const originalDestroy = cloudinary.uploader.destroy;
  let databaseDeleteCalled = false;

  Memories.findOne = async () => ({
    cloudinaryId: 'memory-image-id',
    memoryImage: 'https://example.com/image.jpg',
    deleteOne: async () => {
      databaseDeleteCalled = true;
    },
  });
  cloudinary.uploader.destroy = async () => {
    throw new Error('Cloudinary unavailable');
  };

  try {
    await assert.rejects(
      invokeHandler(deleteMemory, {
        params: { id: 'memory-id' },
        user: { _id: 'user-id' },
      }),
      /Cloudinary unavailable/,
    );
    assert.equal(databaseDeleteCalled, false);
  } finally {
    Memories.findOne = originalFindOne;
    cloudinary.uploader.destroy = originalDestroy;
  }
});

test('full Memory deletion skips Cloudinary when the record has no image', async () => {
  const originalFindOne = Memories.findOne;
  const originalDestroy = cloudinary.uploader.destroy;
  let databaseDeleteCalled = false;

  Memories.findOne = async () => ({
    cloudinaryId: null,
    deleteOne: async () => {
      databaseDeleteCalled = true;
    },
  });
  cloudinary.uploader.destroy = async () => {
    throw new Error('Cloudinary must not be called without an image ID');
  };

  try {
    const response = await invokeHandler(deleteMemory, {
      params: { id: 'memory-id' },
      user: { _id: 'user-id' },
    });

    assert.equal(databaseDeleteCalled, true);
    assert.deepEqual(response.body, { success: true });
  } finally {
    Memories.findOne = originalFindOne;
    cloudinary.uploader.destroy = originalDestroy;
  }
});

test('missing or unauthorized Memories never trigger image cleanup', async () => {
  const originalFindOne = Memories.findOne;
  const originalDestroy = cloudinary.uploader.destroy;
  let destroyCalled = false;

  Memories.findOne = async () => null;
  cloudinary.uploader.destroy = async () => {
    destroyCalled = true;
    return { result: 'ok' };
  };

  try {
    await assert.rejects(
      invokeHandler(deleteMemory, {
        params: { id: 'memory-id' },
        user: { _id: 'user-id' },
      }),
      /not found or user not authorized/,
    );
    assert.equal(destroyCalled, false);
  } finally {
    Memories.findOne = originalFindOne;
    cloudinary.uploader.destroy = originalDestroy;
  }
});

test('standalone image deletion reuses cleanup and clears image fields', async () => {
  const originalFindOne = Memories.findOne;
  const originalDestroy = cloudinary.uploader.destroy;
  const memory = {
    cloudinaryId: 'memory-image-id',
    memoryImage: 'https://example.com/image.jpg',
    save: async () => {},
  };

  Memories.findOne = async () => memory;
  cloudinary.uploader.destroy = async () => ({ result: 'ok' });

  try {
    const response = await invokeHandler(deleteMemoryImage, {
      params: { id: 'memory-id' },
      user: { _id: 'user-id' },
    });

    assert.equal(memory.cloudinaryId, null);
    assert.equal(memory.memoryImage, null);
    assert.deepEqual(response.body, { success: true });
  } finally {
    Memories.findOne = originalFindOne;
    cloudinary.uploader.destroy = originalDestroy;
  }
});
