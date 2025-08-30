import mongoose from 'mongoose';
import { encryptMemory, decryptMemory, isCiphertext } from '../utils/memoryCrypto.js';

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
export default Memories;
