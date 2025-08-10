
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const CORE = process.env.CORE || 'http://localhost:5055';

// Demo create endpoint: creates a Memory Envelope from a canned sentence
app.post('/demo/create', async (req, res) => {
  const id = 'mem_' + uuidv4();
  const now = new Date().toISOString();
  const mev = {
    id,
    type: 'episodic.task.intent',
    topic: 'Hack for Agentic Memory | post-talk retro',
    payload: {
      summary: 'After my Hack presentation, schedule a 45m retro next Friday afternoon.',
      entities: ['Hack for Agentic Memory', 'retro', 'Friday'],
      time_ref: 'next Friday 14:00-14:45'
    },
    context: {
      channel: 'AgentA.Chat',
      tags: ['work','event-followup'],
      salience: 0.82
    },
    policy: {
      owner: 'user:jv',
      acl: [
        {"agent":"AgentB.Calendar","perm":["read","use"]}
      ],
      ttl: 'P14D',
      delete_requires: 'owner-signature'
    },
    provenance: {
      created_at: now,
      created_by: 'AgentA.Chat'
    }
  };

  const r = await fetch(`${CORE}/memories`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(mev)
  });
  const data = await r.json();
  console.log('Created MEV', data);
  res.json({ ok: true, id });
});

// Demo delete endpoint
app.post('/demo/delete', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  const r = await fetch(`${CORE}/memories/${id}/delete`, { method: 'POST' });
  const data = await r.json();
  console.log('Deleted MEV', data);
  res.json(data);
});

const PORT = process.env.PORT || 5056;
app.listen(PORT, () => {
  console.log(`Agent A (Chat) on http://localhost:${PORT}`);
  console.log(`POST /demo/create to create a memory`);
});
