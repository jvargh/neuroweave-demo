
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, 'data');
const MEM_DIR = path.join(DATA_DIR, 'memories');
const DR_DIR = path.join(DATA_DIR, 'deletion_receipts');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

fs.mkdirSync(MEM_DIR, { recursive: true });
fs.mkdirSync(DR_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}
function saveJSON(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

let subscribers = loadJSON(SUBSCRIBERS_FILE, []);
let index = loadJSON(INDEX_FILE, {});

// Simple signer (demo HMAC)
const SECRET = 'local-demo-secret';
function sign(obj) {
  const h = crypto.createHmac('sha256', SECRET);
  h.update(JSON.stringify(obj));
  return 'sig:' + h.digest('hex');
}

app.post('/subscribe', (req, res) => {
  const { agentId, callback } = req.body || {};
  if (!agentId) return res.status(400).json({ error: 'agentId required' });
  const existing = subscribers.find(s => s.agentId === agentId);
  if (existing) {
    existing.callback = callback || null;
  } else {
    subscribers.push({ agentId, callback: callback || null });
  }
  saveJSON(SUBSCRIBERS_FILE, subscribers);
  res.json({ ok: true });
});

// Create memory
app.post('/memories', (req, res) => {
  const mev = req.body;
  if (!mev?.id) return res.status(400).json({ error: 'MEV must include id' });
  const memPath = path.join(MEM_DIR, `${mev.id}.json`);
  mev.provenance = mev.provenance || {};
  mev.provenance.hash = crypto.createHash('sha256').update(JSON.stringify(mev)).digest('hex');
  mev.provenance.sig = sign(mev);
  fs.writeFileSync(memPath, JSON.stringify(mev, null, 2));

  // Update index
  index[mev.id] = {
    id: mev.id,
    topic: mev.topic,
    type: mev.type,
    entities: mev.payload?.entities || [],
    time_ref: mev.payload?.time_ref || null,
    tags: mev.context?.tags || [],
    salience: mev.context?.salience || 0,
    acl: mev.policy?.acl || [],
    deleted: false
  };
  saveJSON(INDEX_FILE, index);

  res.json({ ok: true, id: mev.id, sig: mev.provenance.sig });
});

// List/read (filtered by ACL)
app.get('/memories', (req, res) => {
  const agent = req.query.agent;
  const out = [];
  for (const [id, meta] of Object.entries(index)) {
    if (meta.deleted) continue;
    if (agent) {
      const permitted = (meta.acl || []).some(a => a.agent === agent && (a.perm.includes('read') || a.perm.includes('use')));
      if (!permitted) continue;
    }
    const raw = JSON.parse(fs.readFileSync(path.join(MEM_DIR, `${id}.json`), 'utf-8'));
    out.push(raw);
  }
  res.json(out);
});

// Delete
app.post('/memories/:id/delete', (req, res) => {
  const id = req.params.id;
  if (!index[id]) return res.status(404).json({ error: 'unknown id' });
  index[id].deleted = true;
  saveJSON(INDEX_FILE, index);

  const receipt = {
    mem_id: id,
    action: 'delete',
    deleted_at: new Date().toISOString()
  };
  receipt.proof = sign(receipt);
  fs.writeFileSync(path.join(DR_DIR, `${id}.json`), JSON.stringify(receipt, null, 2));

  res.json({ ok: true, receipt });
});

app.get('/deletions/:id', (req, res) => {
  const id = req.params.id;
  try {
    const raw = fs.readFileSync(path.join(DR_DIR, `${id}.json`), 'utf-8');
    res.type('json').send(raw);
  } catch {
    res.status(404).json({ error: 'not found' });
  }
});

const PORT = process.env.PORT || 5055;
app.listen(PORT, () => {
  console.log(`NeuroWeave Core running on http://localhost:${PORT}`);
});
