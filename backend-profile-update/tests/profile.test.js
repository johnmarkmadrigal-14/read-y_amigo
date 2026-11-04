const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'profile-test-key-not-a-real-secret';
const User = require('../models/User');
const gridfs = require('../utils/gridfs');
const { photoMime, readingPreferences } = require('../utils/profileValidation');
const records = new Map(), files = new Map();
let failSave = false;
User.findById = async id => {
  const data = records.get(String(id));
  if (!data) return null;
  const user = new User(data);
  user.save = async () => {
    await user.validate();
    if (failSave) throw new Error('Simulated database failure');
    records.set(String(id), user.toObject());
    return user;
  };
  return user;
};
User.findByIdAndUpdate = async (id, updates) => {
  const user = await User.findById(id);
  if (!user) return null;
  Object.assign(user, updates); await user.save(); return user;
};
gridfs.saveBuffer = async ({ buffer }) => {
  const id = new mongoose.Types.ObjectId(); files.set(String(id), buffer); return id;
};
gridfs.getBucket = () => ({ delete: async id => { files.delete(String(id)); } });
const auth = require('../routes/auth');
const app = express();app.use(express.json());app.use('/api/auth', auth);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');

test('profile validation rejects invalid preferences and disguised images', () => {
  assert.equal(photoMime(Buffer.from('<script>bad</script>')), null);
  assert.equal(photoMime(png), 'image/png');
  assert.equal(photoMime(Buffer.alloc(6 * 1024 * 1024)), null);
  assert.throws(() => readingPreferences({ textSize: 'huge', followReading: true }));
  assert.throws(() => readingPreferences({ textSize: 'large', followReading: 'false' }));
});

test('both roles can add, replace, reload, and remove own photo; bad uploads preserve the existing photo', async () => {
  const server = app.listen(0, '127.0.0.1');await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  try {
    for (const role of ['teacher', 'learner']) {
      const id = String(new mongoose.Types.ObjectId());
      records.set(id, { _id: id, role, firstName: 'Test', secondName: 'Reader', displayName: 'Reader', age: 20, passwordHash: 'test-hash', ...(role === 'teacher' ? { email: 'test@example.com' } : { username: 'reader' }) });
      const token = jwt.sign({ id, role }, process.env.JWT_SECRET);
      const headers = { Authorization: `Bearer ${token}` };
      const upload = async (buffer = png) => {
        const form = new FormData();form.append('photo', new Blob([buffer], { type: 'image/png' }), 'photo.png');
        return fetch(`${base}/me/photo`, { method: 'POST', headers, body: form });
      };
      const noToken = await fetch(`${base}/me/photo`, { method: 'POST' });assert.equal(noToken.status, 401);
      let response = await upload();assert.equal(response.status, 200);
      let body = await response.json();const first = body.user.profilePhoto;
      assert(first.startsWith('/api/files/'));assert(!('passwordHash' in body.user));
      response = await fetch(`${base}/me`, { headers });assert.equal((await response.json()).user.profilePhoto, first);
      response = await upload();assert.equal(response.status, 200);body = await response.json();
      const second = body.user.profilePhoto;assert.notEqual(first, second);assert(!files.has(first.split('/').pop()));
      response = await upload(Buffer.from('not an image'));assert.equal(response.status, 400);
      response = await upload(Buffer.alloc(5 * 1024 * 1024 + 1));assert.equal(response.status, 400);
      assert.equal(records.get(id).profilePhoto, second);
      const before = files.size;failSave = true;response = await upload();failSave = false;
      assert.equal(response.status, 500);assert.equal(records.get(id).profilePhoto, second);assert.equal(files.size, before);
      response = await fetch(`${base}/me`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: '  Updated  ', role: 'admin', email: 'other@example.com', readingPreferences: { textSize: 'large', followReading: false } }) });
      assert.equal(response.status, 200);body = await response.json();assert.equal(body.user.displayName, 'Updated');assert.equal(body.user.role, role);
      response = await fetch(`${base}/me`, { headers });body = await response.json();assert.deepEqual(body.user.readingPreferences, { textSize: 'large', followReading: false });
      response = await fetch(`${base}/me`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: ' ' }) });assert.equal(response.status, 400);
      response = await fetch(`${base}/me/photo`, { method: 'DELETE', headers });assert.equal(response.status, 200);assert.equal((await response.json()).user.profilePhoto, '');assert(!files.has(second.split('/').pop()));
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
