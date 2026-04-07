# Technical Specification Document (TSD)

## 1. Overview

| 항목 | 내용 |
|------|------|
| 제품명 | Todo API |
| 버전 | 1.0.0 |
| 작성일 | 2026-04-07 |
| 런타임 | Node.js 20 LTS |
| 프레임워크 | Express 4.x |
| 데이터베이스 | PostgreSQL 16 |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────┐
│              Docker Network              │
│                                          │
│  ┌──────────────┐    ┌────────────────┐  │
│  │   api:3000   │───▶│   db:5432      │  │
│  │  (Express)   │    │  (PostgreSQL)  │  │
│  └──────┬───────┘    └────────────────┘  │
│         │ :3000 exposed                  │
└─────────┼───────────────────────────────┘
          │
     HTTP Client
   (팀원 / Postman)
```

---

## 3. 디렉토리 구조

```
/
├── src/
│   ├── index.js                # 서버 시작 (dotenv 로드, listen)
│   ├── app.js                  # Express 앱 설정, 미들웨어, 라우터 마운트
│   ├── config/
│   │   └── db.js               # pg.Pool 싱글턴
│   ├── middleware/
│   │   └── auth.js             # JWT 검증 미들웨어
│   ├── models/
│   │   ├── User.js             # users 테이블 쿼리 헬퍼
│   │   └── Todo.js             # todos 테이블 쿼리 헬퍼
│   ├── controllers/
│   │   ├── authController.js   # register / login 핸들러
│   │   ├── todoController.js   # Todo CRUD 핸들러
│   │   └── userController.js   # /users/me 핸들러
│   └── routes/
│       ├── auth.js             # POST /auth/*
│       ├── todos.js            # /todos CRUD 라우터
│       └── users.js            # GET /users/me
├── db/
│   └── init.sql                # 초기 스키마 (Docker 자동 실행)
├── tests/
│   ├── auth.test.js
│   └── todos.test.js
├── docs/                       # 문서
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

---

## 4. 레이어 설계

### 4.1 요청 흐름

```
Request
  → Express Router
  → express-validator (입력 검증)
  → requireAuth middleware (JWT 검증, 필요 시)
  → Controller (비즈니스 로직)
  → Model (SQL 쿼리)
  → PostgreSQL
  → Response
```

### 4.2 각 레이어 책임

| 레이어 | 파일 | 책임 |
|--------|------|------|
| Router | `routes/*.js` | URL 패턴 정의, 미들웨어 체이닝, validator 적용 |
| Middleware | `middleware/auth.js` | Bearer 토큰 파싱 → `req.userId` 주입 |
| Controller | `controllers/*.js` | 요청 파싱, 모델 호출, HTTP 응답 반환 |
| Model | `models/*.js` | parameterized SQL 실행, 행 반환 |
| Config | `config/db.js` | pg.Pool 생성 및 오류 처리 |

---

## 5. 인증 설계

### 5.1 흐름

```
POST /auth/register or /auth/login
  → bcrypt.compare (login) / bcrypt.hash (register)
  → jwt.sign({ userId }, JWT_SECRET, { expiresIn })
  → { token, user } 반환

이후 요청:
  Authorization: Bearer <token>
  → jwt.verify(token, JWT_SECRET)
  → req.userId = payload.userId
```

### 5.2 토큰 스펙

| 항목 | 값 |
|------|----|
| 알고리즘 | HS256 (기본) |
| Payload | `{ userId, iat, exp }` |
| 만료 | `JWT_EXPIRES_IN` 환경변수 (기본 `7d`) |
| 저장 방식 | 클라이언트 측 관리 (서버 stateless) |

### 5.3 보안 고려사항

- `JWT_SECRET`은 충분히 긴 랜덤 문자열을 사용해야 한다 (32자 이상 권장).
- 비밀번호는 `bcryptjs` salt rounds 10으로 해시한다.
- SQL Injection 방지: 모든 쿼리에 parameterized query (`$1, $2, ...`) 사용.
- 타 사용자 데이터 보호: 모든 Todo 쿼리에 `AND user_id = $n` 조건 포함.

---

## 6. API 상세 명세

### 6.1 공통

- Base URL: `http://<host>:3000`
- Content-Type: `application/json`
- 인증 헤더: `Authorization: Bearer <JWT>`
- 에러 응답 형식:
  ```json
  { "error": "메시지" }
  // 또는 (validation 오류)
  { "errors": [{ "msg": "...", "path": "..." }] }
  ```

---

### 6.2 POST /auth/register

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "홍길동"       // optional
}
```

**Response 201**
```json
{
  "token": "<JWT>",
  "user": { "id": 1, "email": "user@example.com", "name": "홍길동", "created_at": "..." }
}
```

| 상태 코드 | 조건 |
|-----------|------|
| 201 | 생성 성공 |
| 400 | 입력 검증 실패 |
| 409 | 이메일 중복 |

---

### 6.3 POST /auth/login

**Request Body**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Response 200**
```json
{ "token": "<JWT>", "user": { "id": 1, "email": "...", "name": "..." } }
```

| 상태 코드 | 조건 |
|-----------|------|
| 200 | 로그인 성공 |
| 400 | 입력 검증 실패 |
| 401 | 이메일 또는 비밀번호 불일치 |

---

### 6.4 GET /users/me

**Response 200**
```json
{ "id": 1, "email": "user@example.com", "name": "홍길동", "created_at": "..." }
```

---

### 6.5 GET /todos

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `completed` | boolean | - | `true` / `false` 필터 |
| `priority` | string | - | `low` / `medium` / `high` |
| `sortBy` | string | `created_at` | `created_at`, `updated_at`, `due_date`, `priority` |
| `order` | string | `DESC` | `ASC` / `DESC` |
| `limit` | integer | `50` | 최대 반환 수 |
| `offset` | integer | `0` | 건너뛸 수 |

**Response 200** — Todo 배열

---

### 6.6 POST /todos

**Request Body**
```json
{
  "title": "보고서 작성",         // required
  "description": "주간 보고서",   // optional
  "priority": "high",             // optional, default: medium
  "due_date": "2026-04-10"        // optional, ISO 8601
}
```

**Response 201** — 생성된 Todo 객체

---

### 6.7 GET /todos/:id

**Response 200** — Todo 단건  
**Response 404** — 존재하지 않거나 타 사용자 소유

---

### 6.8 PATCH /todos/:id

**Request Body** (모두 optional)
```json
{
  "title": "수정된 제목",
  "description": "수정된 내용",
  "completed": true,
  "priority": "low",
  "due_date": "2026-04-15"
}
```

**Response 200** — 수정된 Todo 객체  
**Response 404** — 존재하지 않거나 타 사용자 소유

---

### 6.9 DELETE /todos/:id

**Response 204** — 삭제 성공 (본문 없음)  
**Response 404** — 존재하지 않거나 타 사용자 소유

---

## 7. 환경 변수

| 변수명 | 필수 | 기본값 | 설명 |
|--------|------|--------|------|
| `PORT` | 아니오 | `3000` | HTTP 리스닝 포트 |
| `DATABASE_URL` | 예 | - | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | 예 | - | JWT 서명 키 |
| `JWT_EXPIRES_IN` | 아니오 | `7d` | 토큰 만료 기간 |

---

## 8. 의존성

### 8.1 런타임

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `express` | ^4.18 | HTTP 프레임워크 |
| `pg` | ^8.11 | PostgreSQL 클라이언트 |
| `bcryptjs` | ^2.4 | 비밀번호 해싱 |
| `jsonwebtoken` | ^9.0 | JWT 발급 / 검증 |
| `dotenv` | ^16.4 | 환경변수 로딩 |
| `express-validator` | ^7.0 | 요청 입력 검증 |

### 8.2 개발 / 테스트

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `nodemon` | ^3.1 | 개발 시 자동 재시작 |
| `jest` | ^29.7 | 테스트 러너 |
| `supertest` | ^7.0 | HTTP 통합 테스트 |

---

## 9. 배포

### 9.1 Docker Compose

```bash
# 빌드 및 실행
docker-compose up --build -d

# 로그 확인
docker-compose logs -f api

# 중지
docker-compose down
```

### 9.2 환경 설정

```bash
cp .env.example .env
# .env에서 JWT_SECRET을 안전한 랜덤 값으로 변경
```

### 9.3 Dockerfile 요약

```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev      # 프로덕션 의존성만 설치
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.js"]
```

---

## 10. 테스트

```bash
# 의존성 설치
npm install

# DATABASE_URL이 설정된 환경에서 실행
npm test
```

- `tests/auth.test.js` — 회원가입, 로그인, 중복 이메일, 잘못된 비밀번호
- `tests/todos.test.js` — Todo 생성, 목록 조회, 완료 처리, 삭제

> 통합 테스트는 실제 PostgreSQL에 연결하여 실행된다.  
> CI 환경에서는 테스트 전 DB 초기화가 필요하다 (`db/init.sql`).
