
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const CORE = process.env.CORE || 'http://localhost:5055';

// Simple fetch of memories permitted to this agent, with a naive filter for 'Friday'
app.get('/suggestions', async (req, res) => {
  const r = await fetch(`${CORE}/memories?agent=AgentB.Calendar`);
  const list = await r.json();

  const suggestions = list
    .filter(m => m.type === 'episodic.task.intent')
    .filter(m => (m.payload?.time_ref || '').toLowerCase().includes('friday'))
    .map(m => ({
      id: m.id,
      title: 'Retro after Hack presentation',
      time: m.payload?.time_ref,
      source: 'NeuroWeave',
      topic: m.topic
    }));

  res.json(suggestions);
});

// Allow the Core to notify us (not used in the basic flow but here for completeness)
app.post('/revoke', (req, res) => {
  console.log('Revocation received', req.body);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5057;
app.listen(PORT, () => {
  console.log(`Agent B (Calendar) on http://localhost:${PORT}`);
  console.log(`GET /suggestions to fetch cross-agent memory suggestions`);
});
