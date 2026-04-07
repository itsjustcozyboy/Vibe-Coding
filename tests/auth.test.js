/**
 * Integration tests for auth endpoints, auth guards, and user profile.
 * Requires a running PostgreSQL instance (set DATABASE_URL in env).
 * Run: npm test
 */
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

const TEST_EMAIL = 'auth_alice@example.com';
const TEST_PASSWORD = 'secret123';
const TEST_NAME = 'Alice';

let token;

beforeAll(async () => {
  await db.query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
  const res = await request(app)
    .post('/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
  token = res.body.token;
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
});

// ──────────────────────────────────────────
// Health
// ──────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ──────────────────────────────────────────
// Register
// ──────────────────────────────────────────
describe('POST /auth/register', () => {
  const TEMP_EMAIL = 'auth_register_temp@example.com';

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = $1', [TEMP_EMAIL]);
  });

  it('TC-AUTH-01: creates a user and returns a JWT (no password exposed)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: TEMP_EMAIL, password: TEST_PASSWORD, name: 'Temp User' });

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(res.body.user.email).toBe(TEMP_EMAIL);
    expect(res.body.user.password).toBeUndefined();
  });

  it('TC-AUTH-02: succeeds without name (name is null)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'auth_noname@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user.name).toBeNull();
    // cleanup
    await db.query('DELETE FROM users WHERE email = $1', ['auth_noname@example.com']);
  });

  it('TC-AUTH-03: rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(409);
  });

  it('TC-AUTH-04: rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: TEST_PASSWORD });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('TC-AUTH-05: rejects password shorter than 6 chars with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'short@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('TC-AUTH-06: rejects empty body with 400', async () => {
    const res = await request(app).post('/auth/register').send({});

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────
// Login
// ──────────────────────────────────────────
describe('POST /auth/login', () => {
  it('TC-LOGIN-01: returns JWT on valid credentials (no password exposed)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(res.body.user.password).toBeUndefined();
  });

  it('TC-LOGIN-02: rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('TC-LOGIN-03: rejects non-existent email with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('TC-LOGIN-04: rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: TEST_PASSWORD });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});

// ──────────────────────────────────────────
// Auth Guards
// ──────────────────────────────────────────
describe('Auth guards', () => {
  it('TC-GUARD-01: returns 401 when Authorization header is absent', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(401);
  });

  it('TC-GUARD-02: returns 401 for invalid JWT string', async () => {
    const res = await request(app)
      .get('/todos')
      .set('Authorization', 'Bearer totally.invalid.token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('TC-GUARD-03: returns 401 when Bearer prefix is missing', async () => {
    const res = await request(app)
      .get('/todos')
      .set('Authorization', token); // no "Bearer " prefix
    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────
// User Profile
// ──────────────────────────────────────────
describe('GET /users/me', () => {
  it('TC-USER-01: returns current user profile without password', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe(TEST_EMAIL);
    expect(res.body.name).toBe(TEST_NAME);
    expect(res.body.created_at).toBeDefined();
    expect(res.body.password).toBeUndefined();
  });

  it('TC-USER-02: returns 401 without auth', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
  });
});
