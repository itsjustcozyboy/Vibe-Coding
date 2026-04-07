/**
 * Integration tests for Todo CRUD endpoints.
 * Requires a running PostgreSQL instance (set DATABASE_URL in env).
 * Run: npm test
 */
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

const TEST_EMAIL = 'todos_alice@example.com';
const TEST_PASSWORD = 'secret123';

let token;
let aliceId;
let todoId; // used across GET / PATCH / DELETE tests

// Seed todos for filter/sort/pagination tests
// completed field is not accepted on create, so we PATCH after creation
const SEED_TODOS = [
  { title: 'Task A', priority: 'high', due_date: '2026-04-20', markCompleted: false },
  { title: 'Task B', priority: 'high', due_date: '2026-04-25', markCompleted: true },
  { title: 'Task C', priority: 'low', due_date: '2026-04-15', markCompleted: false },
  { title: 'Task D', priority: 'medium', due_date: null, markCompleted: false },
  { title: 'Task E', priority: 'medium', due_date: '2026-04-30', markCompleted: true },
];

beforeAll(async () => {
  await db.query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
  const res = await request(app)
    .post('/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Alice' });
  token = res.body.token;
  aliceId = res.body.user.id;

  // Create seed todos
  for (const { markCompleted, ...fields } of SEED_TODOS) {
    const createBody = { title: fields.title, priority: fields.priority };
    if (fields.due_date) createBody.due_date = fields.due_date;
    const r = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send(createBody);
    const id = r.body.id;
    if (!todoId) todoId = id;
    if (markCompleted) {
      await request(app)
        .patch(`/todos/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ completed: true });
    }
  }
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
});

// ──────────────────────────────────────────
// Create Todo
// ──────────────────────────────────────────
describe('POST /todos', () => {
  it('TC-TODO-CREATE-01: title only → 201, defaults applied', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Title only todo' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Title only todo');
    expect(res.body.completed).toBe(false);
    expect(res.body.priority).toBe('medium');
    expect(res.body.description).toBeNull();
    // cleanup
    await db.query('DELETE FROM todos WHERE id = $1', [res.body.id]);
  });

  it('TC-TODO-CREATE-02: all fields → 201, all values reflected', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Full todo',
        description: 'A description',
        priority: 'high',
        due_date: '2026-05-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Full todo');
    expect(res.body.description).toBe('A description');
    expect(res.body.priority).toBe('high');
    expect(res.body.due_date).toBeDefined();
    // cleanup
    await db.query('DELETE FROM todos WHERE id = $1', [res.body.id]);
  });

  it('TC-TODO-CREATE-03: missing title → 400', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 'high' });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('TC-TODO-CREATE-04: invalid priority → 400', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad priority', priority: 'urgent' });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('TC-TODO-CREATE-05: invalid due_date → 400', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad date', due_date: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('TC-TODO-CREATE-06: no auth → 401', async () => {
    const res = await request(app).post('/todos').send({ title: 'Unauth todo' });
    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────
// List Todos
// ──────────────────────────────────────────
describe('GET /todos', () => {
  it('TC-TODO-LIST-01: returns all todos as array', async () => {
    const res = await request(app)
      .get('/todos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((todo) => {
      expect(todo.user_id).toBe(aliceId);
    });
  });

  it('TC-TODO-LIST-02: ?completed=true → only completed todos', async () => {
    const res = await request(app)
      .get('/todos?completed=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((todo) => {
      expect(todo.completed).toBe(true);
    });
  });

  it('TC-TODO-LIST-03: ?completed=false → only incomplete todos', async () => {
    const res = await request(app)
      .get('/todos?completed=false')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((todo) => {
      expect(todo.completed).toBe(false);
    });
  });

  it('TC-TODO-LIST-04: ?priority=high → only high priority todos', async () => {
    const res = await request(app)
      .get('/todos?priority=high')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((todo) => {
      expect(todo.priority).toBe('high');
    });
  });

  it('TC-TODO-LIST-05: ?completed=false&priority=high → combined filter', async () => {
    const res = await request(app)
      .get('/todos?completed=false&priority=high')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.forEach((todo) => {
      expect(todo.completed).toBe(false);
      expect(todo.priority).toBe('high');
    });
  });

  it('TC-TODO-LIST-06: ?sortBy=due_date&order=ASC → non-null dates in ascending order', async () => {
    const res = await request(app)
      .get('/todos?sortBy=due_date&order=ASC')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const withDates = res.body.filter((t) => t.due_date !== null);
    for (let i = 1; i < withDates.length; i++) {
      expect(new Date(withDates[i].due_date) >= new Date(withDates[i - 1].due_date)).toBe(true);
    }
  });

  it('TC-TODO-LIST-07: pagination with limit/offset returns different pages', async () => {
    const page1 = await request(app)
      .get('/todos?limit=2&offset=0')
      .set('Authorization', `Bearer ${token}`);
    const page2 = await request(app)
      .get('/todos?limit=2&offset=2')
      .set('Authorization', `Bearer ${token}`);

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.body.length).toBeLessThanOrEqual(2);
    // pages should not be identical (assuming >= 4 todos exist)
    if (page1.body.length > 0 && page2.body.length > 0) {
      expect(page1.body[0].id).not.toBe(page2.body[0].id);
    }
  });

  it('TC-TODO-LIST-08: new user with no todos returns empty array', async () => {
    const EMPTY_EMAIL = 'todos_empty@example.com';
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: EMPTY_EMAIL, password: TEST_PASSWORD });
    const emptyToken = reg.body.token;

    const res = await request(app)
      .get('/todos')
      .set('Authorization', `Bearer ${emptyToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    await db.query('DELETE FROM users WHERE email = $1', [EMPTY_EMAIL]);
  });
});

// ──────────────────────────────────────────
// Get Todo by ID
// ──────────────────────────────────────────
describe('GET /todos/:id', () => {
  it('TC-TODO-GET-01: returns todo by id', async () => {
    const res = await request(app)
      .get(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(todoId);
    expect(res.body.user_id).toBe(aliceId);
  });

  it('TC-TODO-GET-02: returns 404 for nonexistent id', async () => {
    const res = await request(app)
      .get('/todos/99999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Todo not found');
  });

  it('TC-TODO-GET-03: returns 401 without auth', async () => {
    const res = await request(app).get(`/todos/${todoId}`);
    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────
// Update Todo
// ──────────────────────────────────────────
describe('PATCH /todos/:id', () => {
  it('TC-TODO-UPDATE-01: mark completed → 200, updated_at present', async () => {
    const res = await request(app)
      .patch(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.updated_at).toBeDefined();
  });

  it('TC-TODO-UPDATE-02: update title and priority → 200, fields reflected', async () => {
    const res = await request(app)
      .patch(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title', priority: 'low' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.priority).toBe('low');
  });

  it('TC-TODO-UPDATE-03: set due_date to null clears the date', async () => {
    const res = await request(app)
      .patch(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: null });

    expect(res.status).toBe(200);
    expect(res.body.due_date).toBeNull();
  });

  it('TC-TODO-UPDATE-04: invalid priority → 400', async () => {
    const res = await request(app)
      .patch(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 'critical' });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('TC-TODO-UPDATE-05: nonexistent id → 404', async () => {
    const res = await request(app)
      .patch('/todos/99999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ completed: true });

    expect(res.status).toBe(404);
  });

  it('TC-TODO-UPDATE-06: no auth → 401', async () => {
    const res = await request(app)
      .patch(`/todos/${todoId}`)
      .send({ completed: true });

    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────
// Delete Todo
// ──────────────────────────────────────────
describe('DELETE /todos/:id', () => {
  let deleteTargetId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'To be deleted' });
    deleteTargetId = res.body.id;
  });

  it('TC-TODO-DELETE-01: deletes todo → 204, subsequent GET returns 404', async () => {
    const deleteRes = await request(app)
      .delete(`/todos/${deleteTargetId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/todos/${deleteTargetId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });

  it('TC-TODO-DELETE-02: nonexistent id → 404', async () => {
    const res = await request(app)
      .delete('/todos/99999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('TC-TODO-DELETE-03: no auth → 401', async () => {
    const res = await request(app).delete(`/todos/${todoId}`);
    expect(res.status).toBe(401);
  });
});
