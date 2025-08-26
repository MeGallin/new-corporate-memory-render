# Encrypt Memories (MERN App)

This document describes the changes required to add **field-level encryption** to the `memory` field in the `Memories` collection.  
The database will store ciphertext, while the API continues to expose plaintext.

---

## 1. Environment Variables

Add a master key and feature flag to `.env`:

```bash
ENCRYPTION_ENABLED=true
ENCRYPTION_MASTER_KEY_BASE64=<32-byte-base64-key>
```

Generate a key (Linux/macOS):

```bash
head -c 32 /dev/urandom | base64
```

---

## 2. Crypto Helper

Create `src/lib/memoryCrypto.js`:

```js
const crypto = require('crypto');

const PREFIX = 'gcm1:';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getMasterKey() {
  const b64 = process.env.ENCRYPTION_MASTER_KEY_BASE64 || '';
  if (!b64) throw new Error('ENCRYPTION_MASTER_KEY_BASE64 missing');
  const buf = Buffer.from(b64, 'base64');
  if (buf.length !== KEY_LEN) throw new Error('Master key must be 32 bytes');
  return buf;
}

function deriveDataKey(userId) {
  return crypto.hkdfSync('sha256', getMasterKey(), Buffer.alloc(0), Buffer.from(`memories:${userId}`), KEY_LEN);
}

function isCiphertext(val) {
  return typeof val === 'string' && val.startsWith(PREFIX);
}

function encryptMemory(plaintext, userId) {
  if (!plaintext) return plaintext;
  const key = deriveDataKey(String(userId));
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString('base64');
  return `${PREFIX}${payload}`;
}

function decryptMemory(value, userId) {
  if (!value) return value;
  const str = String(value);
  if (!isCiphertext(str)) return str;
  const key = deriveDataKey(String(userId));
  const buf = Buffer.from(str.slice(PREFIX.length), 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

module.exports = { isCiphertext, encryptMemory, decryptMemory };
```

---

## 3. Schema Changes

Update `models/MemoriesModel.js`:

```js
const mongoose = require('mongoose');
const { encryptMemory, decryptMemory, isCiphertext } = require('../lib/memoryCrypto');

const MemoriesSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title cant be blank'],
    },
    memory: {
      type: String, // ciphertext in DB, plaintext over API
      required: [true, 'Memory cant be blank'],
    },
    setDueDate: { type: Boolean, default: false },
    dueDate: { type: String },
    isComplete: { type: Boolean, default: false },
    hasSentSevenDayReminder: { type: Boolean, default: false },
    hasSentOneDayReminder: { type: Boolean, default: false },
    priority: { type: Number, default: 1 },
    tag: { type: String },
    memoryImage: { type: String },
    cloudinaryId: { type: String },
  },
  { timestamps: true }
);

function shouldEncrypt(doc) {
  const enabled = String(process.env.ENCRYPTION_ENABLED || '').toLowerCase() !== 'false';
  return enabled && typeof doc.memory === 'string' && !isCiphertext(doc.memory);
}

// Encrypt before save
MemoriesSchema.pre('save', function (next) {
  try {
    if (shouldEncrypt(this) && this.user) {
      this.memory = encryptMemory(this.memory, this.user.toString());
    }
    next();
  } catch (e) { next(e); }
});

// Encrypt on findOneAndUpdate
MemoriesSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate() || {};
    const setter = update.$set || update;
    if (!(setter && typeof setter.memory === 'string')) return next();

    const enabled = String(process.env.ENCRYPTION_ENABLED || '').toLowerCase() !== 'false';
    if (!enabled || isCiphertext(setter.memory)) return next();

    let userId = setter.user;
    if (!userId) {
      const doc = await this.model.findOne(this.getQuery()).select('user').lean();
      userId = doc?.user;
    }
    if (!userId) return next();

    const encrypted = encryptMemory(setter.memory, userId.toString());
    if (update.$set) update.$set.memory = encrypted;
    else this.setUpdate({ ...update, memory: encrypted });

    next();
  } catch (e) { next(e); }
});

// Decrypt on output
function transformOut(doc, ret) {
  try {
    const userId = ret?.user?.toString?.() ?? ret?.user;
    if (typeof ret.memory === 'string') {
      ret.memory = decryptMemory(ret.memory, userId);
    }
  } catch {
    ret.memory = '[DECRYPTION_ERROR]';
  }
  return ret;
}

MemoriesSchema.set('toJSON', { transform: transformOut });
MemoriesSchema.set('toObject', { transform: transformOut });

const Memories = mongoose.model('Memories', MemoriesSchema);
module.exports = Memories;
```

---

## 4. Backfill Script

Encrypt existing plaintext rows.  
`scripts/encrypt-backfill.js`:

```js
require('dotenv').config();
const mongoose = require('mongoose');
const Memories = require('../src/models/MemoriesModel');
const { isCiphertext, encryptMemory } = require('../src/lib/memoryCrypto');

(async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const batch = 500;
  let lastId = null;
  let total = 0;

  while (true) {
    const filter = lastId ? { _id: { $gt: lastId } } : {};
    const docs = await Memories.find(filter).sort({ _id: 1 }).limit(batch).select('_id user memory').lean();
    if (docs.length === 0) break;

    const ops = docs
      .filter(d => d.memory && !isCiphertext(d.memory) && d.user)
      .map(d => ({
        updateOne: {
          filter: { _id: d._id, memory: d.memory },
          update: { $set: { memory: encryptMemory(d.memory, d.user.toString()) } },
        },
      }));

    if (ops.length) {
      const res = await Memories.bulkWrite(ops, { ordered: false });
      total += res.modifiedCount || 0;
      console.log(`Encrypted ${res.modifiedCount || 0} docs (total ${total}).`);
    }

    lastId = docs[docs.length - 1]._id;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`Done. Total encrypted: ${total}`);
  await mongoose.disconnect();
})();
```
