// Real account/settings routes + isolated real MongoDB. Only upstream AI HTTP is mocked.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const candidates = [process.env.ACCOUNT_BACKEND_DIR, path.resolve(__dirname, '../../.test-backend/backend'), path.resolve(__dirname, '../../../C-destination/backend')].filter(Boolean);
const backend = candidates.find(p => fs.existsSync(path.join(p, 'services/accountProviders.service.js')));
if (!backend) throw new Error('Set ACCOUNT_BACKEND_DIR to the updated C/backend checkout. See docs/testing.md.');
const backendRequire = createRequire(path.join(backend, 'package.json'));
const express = backendRequire('express');
const cors = backendRequire('cors');
const mongoose = backendRequire('mongoose');
const multer = backendRequire('multer');
const jwt = backendRequire('jsonwebtoken');
let nock;
const { MongoMemoryServer } = backendRequire('mongodb-memory-server');
const Settings = require(path.join(backend, 'models/settings.model'));
const Conversations = require(path.join(backend, 'models/providerConversation.model'));
const registerTranslation = require(path.join(backend, 'routes/translatorRoutes'));
const registerAccounts = require(path.join(backend, 'routes/accountProviderRoutes'));
const secret = 'local-e2e-only-not-a-production-secret';
const user = { _id: '000000000000000000000001', name: 'E2E administrator', email: 'test@example.invalid', role: 'admin' };
const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '1h' });
let mongo, server, nextConversation = 0;
const messages = [];
function seed() {
  return [
    { providerId: 'chatgpt_e2e', name: 'ChatGPT Test Account', apiKeys: ['fake-chatgpt-session'], chatgptAccountId: 'test-account', selectedModel: 'auto', models: [{ modelId: 'auto', modelName: 'Auto' }], taskConversations: {} },
    { providerId: 'gemini_web_e2e', name: 'Gemini Test Account', apiKeys: ['__Secure-1PSID=e2e-fake; __Secure-1PSIDTS=e2e-fake'], selectedModel: 'gemini-web', models: [{ modelId: 'gemini-web', modelName: 'Adaptive' }], geminiAccountIndex: 1, allowGuestFallback: false, taskConversations: {} },
    { providerId: 'deepseek_worker_e2e', name: 'DeepSeek Worker Test', apiKeys: ['fake-ds-token'], baseUrl: 'https://deepseek-pow.contact-3mh.workers.dev', selectedModel: 'deepseek-chat', models: [{ modelId: 'deepseek-chat', modelName: 'DeepSeek Chat' }], searchEnabled: false },
  ];
}
function upstream() {
  nock = backendRequire('nock');
  nock.disableNetConnect(); nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);
  const gpt = nock('https://android.chat.openai.com').persist();
  gpt.get('/backend-api/models').reply(200, { models: [{ slug: 'auto', title: 'Auto' }, { slug: 'gpt-test', title: 'GPT Test' }] });
  gpt.get('/backend-api/gizmos/snorlax/sidebar').query(true).reply(200, { items: [{ gizmo: { gizmo: { id: 'novel-project', display: { name: 'Novel project' } } }, conversations: { items: [{ id: 'project-existing-chat', title: 'Existing project chat' }] } }] });
  gpt.get('/backend-api/conversations').query(true).reply(200, { items: [{ id: 'general-chat', title: 'General chat' }], total: 1 });
  gpt.get(/\/backend-api\/conversation\/.+/).reply(uri => [200, { current_node: 'latest-parent', gizmo_id: uri.includes('general-chat') ? '' : 'novel-project', title: 'Conversation' }]);
  gpt.post('/backend-api/conversation').reply((uri, body) => {
    messages.push(body);
    const cid = body.conversation_id || `new-project-chat-${++nextConversation}`;
    return [200, 'data: ' + JSON.stringify({ conversation_id: cid, message: { id: 'answer-node', author: { role: 'assistant' }, channel: 'final', status: 'finished_successfully', end_turn: true, content: { parts: ['وصلت الرسالة إلى الخادم وأُنشئت المحادثة بنجاح.'] } } }) + '\n\ndata: [DONE]\n\n', { 'Content-Type': 'text/event-stream' }];
  });
  gpt.post('/backend-api/files').reply(200, { file_id: 'e2e-file', upload_url: 'https://storage.example.invalid/upload' });
  nock('https://storage.example.invalid').persist().put('/upload').reply(201);
  gpt.post('/backend-api/files/e2e-file/uploaded').reply(200, {});
}
(async () => {
  // Start DB before blocking external hosts; downloading MongoDB is allowed if uncached.
  mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); await Conversations.init();
  await Settings.create({ translationProviders: seed() }); upstream();
  const app = express(); app.use(cors()); app.use(express.json({ limit: '12mb' }));
  const auth = (req, res, next) => {
    try { req.user = jwt.verify((req.headers.authorization || '').replace(/^Bearer /, ''), secret); next(); }
    catch { res.status(401).json({ message: 'No valid session' }); }
  };
  const admin = (req, res, next) => req.user.role === 'admin' ? next() : res.sendStatus(403);
  app.get('/__health', (req, res) => res.json({ ok: true }));
  app.get('/__session', (req, res) => res.json({ token }));
  app.get('/__evidence', auth, admin, async (req, res) => res.json({ settings: (await Settings.findOne()).toObject({ flattenMaps: true }), contexts: await Conversations.find().lean(), messages }));
  app.post('/__reset', auth, admin, async (req, res) => { await Settings.deleteMany({}); await Conversations.deleteMany({}); await Settings.create({ translationProviders: seed() }); messages.length = 0; nextConversation = 0; res.json({ ok: true }); });
  app.get('/api/user', auth, (req, res) => res.json({ user }));
  app.get('/api/categories', (req, res) => res.json([]));
  app.post('/api/analytics/collect', (req, res) => res.sendStatus(204));
  app.get('/api/novels', (req, res) => res.json({ novels: [], total: 0 }));
  registerTranslation(app, auth, admin);
  registerAccounts(app, auth, admin, multer({ limits: { fileSize: 10 * 1024 * 1024 } }));
  server = app.listen(4174, '127.0.0.1', () => console.log('Account integration backend ready on 4174; isolated MongoDB; simulated AI upstream.'));
})().catch(async err => { console.error(err.message); await mongoose.disconnect(); if (mongo) await mongo.stop(); process.exitCode = 1; });
async function shutdown() { if (server) await new Promise(r => server.close(r)); await mongoose.disconnect(); if (mongo) await mongo.stop(); process.exit(0); }
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
