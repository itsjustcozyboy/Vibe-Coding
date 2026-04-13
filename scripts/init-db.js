#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function run() {
  const sqlPath = path.resolve(__dirname, '../db/init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('DB init completed');
  process.exit(0);
}

run().catch((e) => {
  console.error('DB init failed:', e.message || e);
  process.exit(1);
});
