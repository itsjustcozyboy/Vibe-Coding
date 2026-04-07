const { validationResult } = require('express-validator');
const Todo = require('../models/Todo');

exports.list = async (req, res) => {
  const { completed, priority, sortBy, order, limit, offset } = req.query;
  const options = {
    completed: completed !== undefined ? completed === 'true' : undefined,
    priority,
    sortBy,
    order,
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  };
  const todos = await Todo.findAllByUser(req.userId, options);
  res.json(todos);
};

exports.get = async (req, res) => {
  const todo = await Todo.findOne(req.params.id, req.userId);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json(todo);
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, priority, due_date } = req.body;
  const todo = await Todo.create({ userId: req.userId, title, description, priority, due_date });
  res.status(201).json(todo);
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const todo = await Todo.update(req.params.id, req.userId, req.body);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json(todo);
};

exports.remove = async (req, res) => {
  const deleted = await Todo.delete(req.params.id, req.userId);
  if (!deleted) return res.status(404).json({ error: 'Todo not found' });
  res.status(204).send();
};
