require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Memories = require('../models/MemoriesModel');
const { isCiphertext, encryptMemory } = require('../utils/memoryCrypto');

(async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  await mongoose.connect(process.env.MONGODB_URI);
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
