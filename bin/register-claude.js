#!/usr/bin/env node
'use strict';
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { registerClaudeAction } = require('../src/skills/registerClaudeAction');

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('text', { type: 'string', demandOption: true, description: 'Description of the action to register' })
    .option('board', { type: 'number', default: 1 })
    .option('dry', { type: 'boolean', default: false })
    .option('actor', { type: 'string', default: 'claude' })
    .help().argv;

  try {
    const res = await registerClaudeAction({ text: argv.text, boardId: argv.board, dryRun: argv.dry, actor: argv.actor });
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(2);
  }
}

main();
