/**
 * Integration tests for data isolation between users.
 * Requires a running PostgreSQL instance (set DATABASE_URL in env).
 * Run: npm test
 */
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

const ALICE_EMAIL = 'isolation_alice@example.com';
const BOB_EMAIL = 'isolation_bob@example.com';
const PASSWORD = 'secret123';

let aliceToken;
let bobToken;
let bobId;
let aliceTodoId;

beforeAll(async () => {
  // Cleanup in case of previous failed run
  await db.query('DELETE FROM users WHERE email = ANY($1)', [[ALICE_EMAIL, BOB_EMAIL]]);

  // Register alice and create a todo
  const aliceRes = await request(app)
    .post('/auth/register')
    .send({ email: ALICE_EMAIL, password: PASSWORD, name: 'Isolation Alice' });
  aliceToken = aliceRes.body.token;

  const todoRes = await request(app)
    .post('/todos')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ title: "Alice's private todo", priority: 'high' });
  aliceTodoId = todoRes.body.id;

  // Register bob and create 2 todos
  const bobRes = await request(app)
    .post('/auth/register')
    .send({ email: BOB_EMAIL, password: PASSWORD, name: 'Isolation Bob' });
  bobToken = bobRes.body.token;
  bobId = bobRes.body.user.id;

  await request(app)
    .post('/todos')
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ title: "Bob's todo 1" });
  await request(app)
    .post('/todos')
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ title: "Bob's todo 2" });
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE email = ANY($1)', [[ALICE_EMAIL, BOB_EMAIL]]);
});

describe('Data isolation', () => {
  it("TC-ISOLATION-01: bob cannot GET alice's todo → 404", async () => {
    const res = await request(app)
      .get(`/todos/${aliceTodoId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(404);
  });

  it("TC-ISOLATION-02: bob cannot PATCH alice's todo → 404", async () => {
    const res = await request(app)
      .patch(`/todos/${aliceTodoId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ completed: true });

    expect(res.status).toBe(404);
  });

  it("TC-ISOLATION-03: bob cannot DELETE alice's todo → 404", async () => {
    const res = await request(app)
      .delete(`/todos/${aliceTodoId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(404);
  });

  it("TC-ISOLATION-04: bob's todo list contains only bob's todos", async () => {
    const res = await request(app)
      .get('/todos')
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    res.body.forEach((todo) => {
      expect(todo.user_id).toBe(bobId);
    });
  });
});
