'use strict';
const db = require('../config/db');

/**
 * Minimal processor that persists an action into claude_actions table.
 * @param {{ text: string, boardId?: number, actor?: string, dryRun?: boolean }} options
 */
async function processNaturalLanguageToSupabase(options = {}) {
  const { text, boardId = 1, actor = 'claude', dryRun = false } = options;
  if (!text || typeof text !== 'string') throw new Error('text is required');
  if (dryRun) return { ok: true, simulated: true, text, boardId, actor };

  const q = `INSERT INTO claude_actions (text, board_id, actor) VALUES ($1, $2, $3) RETURNING id, created_at`;
  const { rows } = await db.query(q, [text, boardId, actor]);
  return { id: rows[0].id, created_at: rows[0].created_at };
}

module.exports = { processNaturalLanguageToSupabase };