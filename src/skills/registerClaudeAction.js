'use strict';
const { processNaturalLanguageToSupabase } = require('../lib/processNaturalLanguageToSupabase');

/**
 * registerClaudeAction
 * Sends a description of what Claude did to the agent which plans and persists to Supabase.
 * @param {{ text: string, boardId?: number, dryRun?: boolean, actor?: string }} options
 */
async function registerClaudeAction(options = {}) {
  const { text, boardId = 1, dryRun = false, actor = 'claude' } = options;
  if (!text || typeof text !== 'string') throw new Error('text is required');
  const input = actor ? `[${actor}] ${text}` : text;
  return processNaturalLanguageToSupabase({ text: input, boardId, dryRun });
}

module.exports = { registerClaudeAction };
