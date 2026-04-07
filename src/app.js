const express = require('express');

const app = express();

app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/todos', require('./routes/todos'));
app.use('/users', require('./routes/users'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
