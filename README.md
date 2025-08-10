# NeuroWeave Demo

A minimal local demo showing **cross-agent memory**:
- Agent A (Chat) creates a **Memory Envelope (MEV)** and stores it in **NeuroWeave Core**.
- Agent B (Calendar) fetches memories it has permission to use and surfaces a suggestion.
- We then **delete** the memory and show that Agent B can no longer recall it (with a deletion receipt).

## Requirements
- Node.js 18+ (uses built-in `fetch`)
- npm or pnpm

## Quick Start
```bash
# 1) Core
cd packages/neuroweave-core
npm install
npm start

# 2) Agent A (chat)
cd ../agent-a-chat
npm install
npm start

# 3) Agent B (calendar)
cd ../agent-b-calendar
npm install
npm start
```

### Create a memory (Agent A)
```bash
curl -X POST http://localhost:5056/demo/create
```

### See suggestions (Agent B)
```bash
curl http://localhost:5057/suggestions
```

### Delete the memory (Agent A)
```bash
# Replace <id> with the id returned by the create call or logged in Agent A console
curl -X POST http://localhost:5056/demo/delete -H "Content-Type: application/json" -d '{"id":"<id>"}'
```

### Verify deletion
```bash
curl http://localhost:5057/suggestions
```

## Notes
- All storage is local under `packages/neuroweave-core/data`.
- MEV is kept simple for the hackathon demo. Extend as needed.
- No external services are required.
