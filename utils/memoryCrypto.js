import crypto from 'crypto';

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
  return crypto.hkdfSync(
    'sha256',
    getMasterKey(),
    Buffer.alloc(0),
    Buffer.from(`memories:${userId}`),
    KEY_LEN,
  );
}

function isCiphertext(val) {
  return typeof val === 'string' && val.startsWith(PREFIX);
}

function encryptMemory(plaintext, userId) {
  if (!plaintext) return plaintext;
  const key = deriveDataKey(String(userId));
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
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
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    'utf8',
  );
}

export { isCiphertext, encryptMemory, decryptMemory };
