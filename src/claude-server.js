'use strict';
const http = require('http');
const { registerClaudeAction } = require('./skills/registerClaudeAction');

const PORT = Number(process.env.CLAUDE_INGEST_PORT || 8787);

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'vibe-claude-ingest' });

    if (req.method === 'POST' && req.url === '/register-claude') {
      const body = await parseBody(req);
      const text = body.text;
      const boardId = Number(body.board_id || body.board || 1);
      const dryRun = Boolean(body.dry_run || body.dry);
      const actor = body.actor || 'claude';

      const result = await registerClaudeAction({ text, boardId, dryRun, actor });
      return json(res, 200, { ok: true, result });
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    return json(res, 400, { ok: false, error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Vibe Claude ingest server running on http://localhost:${PORT}`);
  console.log('POST /register-claude with JSON: { text, board_id, dry_run }');
});
