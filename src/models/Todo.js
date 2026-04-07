const db = require('../config/db');

const Todo = {
  async findAllByUser(userId, { completed, priority, sortBy = 'created_at', order = 'DESC', limit = 50, offset = 0 } = {}) {
    const conditions = ['user_id = $1'];
    const values = [userId];
    let idx = 2;

    if (completed !== undefined) {
      conditions.push(`completed = $${idx++}`);
      values.push(completed);
    }
    if (priority) {
      conditions.push(`priority = $${idx++}`);
      values.push(priority);
    }

    const allowed = { created_at: true, updated_at: true, due_date: true, priority: true };
    const col = allowed[sortBy] ? sortBy : 'created_at';
    const dir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    values.push(limit, offset);
    const query = `
      SELECT * FROM todos
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${col} ${dir}
      LIMIT $${idx++} OFFSET $${idx}
    `;
    const { rows } = await db.query(query, values);
    return rows;
  },

  async findOne(id, userId) {
    const { rows } = await db.query(
      'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] || null;
  },

  async create({ userId, title, description, priority, due_date }) {
    const { rows } = await db.query(
      `INSERT INTO todos (user_id, title, description, priority, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, title, description || null, priority || 'medium', due_date || null]
    );
    return rows[0];
  },

  async update(id, userId, fields) {
    const allowed = ['title', 'description', 'completed', 'priority', 'due_date'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    }

    if (sets.length === 0) return null;

    values.push(id, userId);
    const { rows } = await db.query(
      `UPDATE todos SET ${sets.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, userId) {
    const { rowCount } = await db.query(
      'DELETE FROM todos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rowCount > 0;
  },
};

module.exports = Todo;
