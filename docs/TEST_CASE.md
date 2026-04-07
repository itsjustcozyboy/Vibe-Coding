# Test Case Document

## 개요

| 항목 | 내용 |
|------|------|
| 제품명 | Todo API |
| 버전 | 1.0.0 |
| 작성일 | 2026-04-07 |
| 기준 문서 | PRD.md |
| Base URL | `http://localhost:3000` |

> **표기 규칙**
> - `- [ ]` 미실행 / `- [x]` 통과 / `- [!]` 실패
> - 각 케이스 ID는 `TC-{그룹}-{번호}` 형식

---

## 목차

1. [서버 상태 확인](#1-서버-상태-확인)
2. [인증 — 회원가입](#2-인증--회원가입)
3. [인증 — 로그인](#3-인증--로그인)
4. [인증 — 보호 엔드포인트 접근 제어](#4-인증--보호-엔드포인트-접근-제어)
5. [사용자 프로필 조회](#5-사용자-프로필-조회)
6. [Todo 생성](#6-todo-생성)
7. [Todo 목록 조회](#7-todo-목록-조회)
8. [Todo 단건 조회](#8-todo-단건-조회)
9. [Todo 수정](#9-todo-수정)
10. [Todo 삭제](#10-todo-삭제)
11. [데이터 격리 — 타 사용자 접근 차단](#11-데이터-격리--타-사용자-접근-차단)

---

## 1. 서버 상태 확인

> 관련 요구사항: 배포 정상 기동 확인

---

### TC-HEALTH-01 — 서버 정상 응답 확인

- [ ] **Endpoint:** `GET /health`
- [ ] **Auth:** 불필요

**Request**
```
GET /health
```

**Expected Response**
```
Status: 200 OK
Body: { "status": "ok" }
```

---

## 2. 인증 — 회원가입

> 관련 요구사항: FR-01, FR-04, US-01

---

### TC-AUTH-01 — 회원가입 성공

- [ ] **Endpoint:** `POST /auth/register`
- [ ] **Auth:** 불필요

**Request**
```json
POST /auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "secret123",
  "name": "Alice"
}
```

**Expected Response**
```
Status: 201 Created
Body:
{
  "token": "<JWT 문자열>",
  "user": {
    "id": <number>,
    "email": "alice@example.com",
    "name": "Alice",
    "created_at": "<ISO 8601>"
  }
}
```

**검증 포인트**
- [ ] 응답에 `token` 필드가 존재한다
- [ ] `token`이 JWT 형식(`xxxxx.yyyyy.zzzzz`)이다
- [ ] `user.password` 필드가 응답에 포함되지 않는다
- [ ] `user.email`이 요청한 이메일과 일치한다

---

### TC-AUTH-02 — 이름(name) 없이 회원가입 성공

- [ ] **Endpoint:** `POST /auth/register`
- [ ] **Auth:** 불필요

**Request**
```json
{
  "email": "bob@example.com",
  "password": "secret123"
}
```

**Expected Response**
```
Status: 201 Created
Body: { "token": "...", "user": { "name": null, ... } }
```

---

### TC-AUTH-03 — 중복 이메일로 회원가입 실패

- [ ] **Endpoint:** `POST /auth/register`
- [ ] **사전 조건:** `alice@example.com` 계정이 이미 존재함 (TC-AUTH-01 선행)

**Request**
```json
{
  "email": "alice@example.com",
  "password": "another123"
}
```

**Expected Response**
```
Status: 409 Conflict
Body: { "error": "Email already in use" }
```

---

### TC-AUTH-04 — 이메일 형식 오류로 회원가입 실패

- [ ] **Endpoint:** `POST /auth/register`

**Request**
```json
{
  "email": "not-an-email",
  "password": "secret123"
}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ { "msg": <string>, "path": "email" } ] }
```

---

### TC-AUTH-05 — 비밀번호 6자 미만으로 회원가입 실패

- [ ] **Endpoint:** `POST /auth/register`

**Request**
```json
{
  "email": "short@example.com",
  "password": "abc"
}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ { "msg": "Password must be at least 6 characters", "path": "password" } ] }
```

---

### TC-AUTH-06 — 필수 필드 누락으로 회원가입 실패

- [ ] **Endpoint:** `POST /auth/register`

**Request**
```json
{}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ ... ] }
```

---

## 3. 인증 — 로그인

> 관련 요구사항: FR-02, US-02

---

### TC-LOGIN-01 — 로그인 성공

- [ ] **Endpoint:** `POST /auth/login`
- [ ] **사전 조건:** `alice@example.com` 계정 존재

**Request**
```json
POST /auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Expected Response**
```
Status: 200 OK
Body:
{
  "token": "<JWT 문자열>",
  "user": {
    "id": <number>,
    "email": "alice@example.com",
    "name": "Alice",
    "created_at": "<ISO 8601>"
  }
}
```

**검증 포인트**
- [ ] 응답에 `token` 필드가 존재한다
- [ ] `user.password` 필드가 응답에 포함되지 않는다

---

### TC-LOGIN-02 — 잘못된 비밀번호로 로그인 실패

- [ ] **Endpoint:** `POST /auth/login`

**Request**
```json
{
  "email": "alice@example.com",
  "password": "wrongpassword"
}
```

**Expected Response**
```
Status: 401 Unauthorized
Body: { "error": "Invalid credentials" }
```

---

### TC-LOGIN-03 — 존재하지 않는 이메일로 로그인 실패

- [ ] **Endpoint:** `POST /auth/login`

**Request**
```json
{
  "email": "nobody@example.com",
  "password": "secret123"
}
```

**Expected Response**
```
Status: 401 Unauthorized
Body: { "error": "Invalid credentials" }
```

---

### TC-LOGIN-04 — 이메일 형식 오류로 로그인 실패

- [ ] **Endpoint:** `POST /auth/login`

**Request**
```json
{
  "email": "invalid-email",
  "password": "secret123"
}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ { "path": "email", ... } ] }
```

---

## 4. 인증 — 보호 엔드포인트 접근 제어

> 관련 요구사항: FR-03, 비기능 요구사항(보안)

---

### TC-GUARD-01 — Authorization 헤더 없이 접근 실패

- [ ] **Endpoint:** `GET /todos`
- [ ] **Auth:** 없음

**Request**
```
GET /todos
```

**Expected Response**
```
Status: 401 Unauthorized
Body: { "error": "Missing or invalid authorization header" }
```

---

### TC-GUARD-02 — 잘못된 JWT로 접근 실패

- [ ] **Endpoint:** `GET /todos`

**Request**
```
GET /todos
Authorization: Bearer this.is.invalid
```

**Expected Response**
```
Status: 401 Unauthorized
Body: { "error": "Invalid or expired token" }
```

---

### TC-GUARD-03 — Bearer 접두사 누락으로 접근 실패

- [ ] **Endpoint:** `GET /todos`

**Request**
```
GET /todos
Authorization: <JWT>
```

**Expected Response**
```
Status: 401 Unauthorized
Body: { "error": "Missing or invalid authorization header" }
```

---

## 5. 사용자 프로필 조회

> 관련 요구사항: US-09

---

### TC-USER-01 — 내 프로필 조회 성공

- [ ] **Endpoint:** `GET /users/me`
- [ ] **Auth:** `Bearer <alice의 JWT>`

**Request**
```
GET /users/me
Authorization: Bearer <token>
```

**Expected Response**
```
Status: 200 OK
Body:
{
  "id": <number>,
  "email": "alice@example.com",
  "name": "Alice",
  "created_at": "<ISO 8601>"
}
```

**검증 포인트**
- [ ] `password` 필드가 응답에 없다

---

### TC-USER-02 — 인증 없이 프로필 조회 실패

- [ ] **Endpoint:** `GET /users/me`
- [ ] **Auth:** 없음

**Expected Response**
```
Status: 401 Unauthorized
```

---

## 6. Todo 생성

> 관련 요구사항: FR-05, US-03

---

### TC-TODO-CREATE-01 — 필수 필드만으로 Todo 생성 성공

- [ ] **Endpoint:** `POST /todos`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
POST /todos
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "보고서 작성"
}
```

**Expected Response**
```
Status: 201 Created
Body:
{
  "id": <number>,
  "user_id": <number>,
  "title": "보고서 작성",
  "description": null,
  "completed": false,
  "priority": "medium",
  "due_date": null,
  "created_at": "<ISO 8601>",
  "updated_at": "<ISO 8601>"
}
```

**검증 포인트**
- [ ] `completed`의 기본값이 `false`다
- [ ] `priority`의 기본값이 `"medium"`이다

---

### TC-TODO-CREATE-02 — 모든 필드로 Todo 생성 성공

- [ ] **Endpoint:** `POST /todos`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "title": "코드 리뷰",
  "description": "PR #42 리뷰",
  "priority": "high",
  "due_date": "2026-04-10"
}
```

**Expected Response**
```
Status: 201 Created
Body:
{
  "title": "코드 리뷰",
  "description": "PR #42 리뷰",
  "priority": "high",
  "due_date": "2026-04-10",
  "completed": false,
  ...
}
```

---

### TC-TODO-CREATE-03 — 제목 누락으로 Todo 생성 실패

- [ ] **Endpoint:** `POST /todos`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "priority": "high"
}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ { "msg": "Title is required", "path": "title" } ] }
```

---

### TC-TODO-CREATE-04 — 유효하지 않은 priority 값으로 생성 실패

- [ ] **Endpoint:** `POST /todos`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "title": "테스트",
  "priority": "urgent"
}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ { "path": "priority", ... } ] }
```

---

### TC-TODO-CREATE-05 — 유효하지 않은 due_date 형식으로 생성 실패

- [ ] **Endpoint:** `POST /todos`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "title": "테스트",
  "due_date": "내일"
}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ { "path": "due_date", ... } ] }
```

---

### TC-TODO-CREATE-06 — 인증 없이 Todo 생성 실패

- [ ] **Endpoint:** `POST /todos`
- [ ] **Auth:** 없음

**Expected Response**
```
Status: 401 Unauthorized
```

---

## 7. Todo 목록 조회

> 관련 요구사항: FR-06, FR-07, FR-08, FR-09, US-04, US-08

---

### TC-TODO-LIST-01 — 내 Todo 목록 조회 성공

- [ ] **Endpoint:** `GET /todos`
- [ ] **Auth:** `Bearer <JWT>`
- [ ] **사전 조건:** alice 계정에 Todo 2개 이상 존재

**Request**
```
GET /todos
Authorization: Bearer <token>
```

**Expected Response**
```
Status: 200 OK
Body: [ { "id": ..., "title": ..., ... }, ... ]
```

**검증 포인트**
- [ ] 응답이 배열이다
- [ ] 모든 항목의 `user_id`가 alice의 ID와 일치한다

---

### TC-TODO-LIST-02 — completed=true 필터링

- [ ] **Endpoint:** `GET /todos?completed=true`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 200 OK
Body: (모든 항목의 completed가 true인 배열)
```

---

### TC-TODO-LIST-03 — completed=false 필터링

- [ ] **Endpoint:** `GET /todos?completed=false`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 200 OK
Body: (모든 항목의 completed가 false인 배열)
```

---

### TC-TODO-LIST-04 — priority=high 필터링

- [ ] **Endpoint:** `GET /todos?priority=high`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 200 OK
Body: (모든 항목의 priority가 "high"인 배열)
```

---

### TC-TODO-LIST-05 — 복합 필터링 (completed + priority)

- [ ] **Endpoint:** `GET /todos?completed=false&priority=high`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 200 OK
Body: (completed=false이고 priority="high"인 항목만)
```

---

### TC-TODO-LIST-06 — due_date 오름차순 정렬

- [ ] **Endpoint:** `GET /todos?sortBy=due_date&order=ASC`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 200 OK
Body: (due_date 기준 오름차순 정렬된 배열)
```

---

### TC-TODO-LIST-07 — 페이지네이션 (limit + offset)

- [ ] **Endpoint:** `GET /todos?limit=2&offset=0`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 200 OK
Body: (최대 2개 항목 반환)
```

**이어서 다음 페이지:**
```
GET /todos?limit=2&offset=2
→ 다음 2개 항목 반환
```

---

### TC-TODO-LIST-08 — Todo가 없는 사용자의 목록 조회

- [ ] **Endpoint:** `GET /todos`
- [ ] **Auth:** `Bearer <신규 사용자 JWT>`

**Expected Response**
```
Status: 200 OK
Body: []
```

---

## 8. Todo 단건 조회

> 관련 요구사항: FR-06, US-04

---

### TC-TODO-GET-01 — 내 Todo 단건 조회 성공

- [ ] **Endpoint:** `GET /todos/:id`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```
GET /todos/1
Authorization: Bearer <token>
```

**Expected Response**
```
Status: 200 OK
Body:
{
  "id": 1,
  "user_id": <alice의 id>,
  "title": "보고서 작성",
  ...
}
```

---

### TC-TODO-GET-02 — 존재하지 않는 Todo 조회 실패

- [ ] **Endpoint:** `GET /todos/99999`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 404 Not Found
Body: { "error": "Todo not found" }
```

---

### TC-TODO-GET-03 — 인증 없이 단건 조회 실패

- [ ] **Endpoint:** `GET /todos/1`
- [ ] **Auth:** 없음

**Expected Response**
```
Status: 401 Unauthorized
```

---

## 9. Todo 수정

> 관련 요구사항: FR-05, FR-10, US-05, US-06

---

### TC-TODO-UPDATE-01 — 완료 상태 변경 성공 (US-05)

- [ ] **Endpoint:** `PATCH /todos/:id`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
PATCH /todos/1
Authorization: Bearer <token>

{
  "completed": true
}
```

**Expected Response**
```
Status: 200 OK
Body: { "id": 1, "completed": true, ... }
```

**검증 포인트**
- [ ] `completed`가 `true`로 변경되었다
- [ ] `updated_at`이 수정 이전 값보다 크거나 같다 (FR-10)

---

### TC-TODO-UPDATE-02 — 제목 및 우선순위 수정 성공

- [ ] **Endpoint:** `PATCH /todos/:id`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "title": "수정된 제목",
  "priority": "low"
}
```

**Expected Response**
```
Status: 200 OK
Body: { "title": "수정된 제목", "priority": "low", ... }
```

---

### TC-TODO-UPDATE-03 — 마감일 수정 성공

- [ ] **Endpoint:** `PATCH /todos/:id`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "due_date": "2026-04-30"
}
```

**Expected Response**
```
Status: 200 OK
Body: { "due_date": "2026-04-30", ... }
```

---

### TC-TODO-UPDATE-04 — 유효하지 않은 priority로 수정 실패

- [ ] **Endpoint:** `PATCH /todos/:id`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "priority": "critical"
}
```

**Expected Response**
```
Status: 400 Bad Request
Body: { "errors": [ { "path": "priority", ... } ] }
```

---

### TC-TODO-UPDATE-05 — 존재하지 않는 Todo 수정 실패

- [ ] **Endpoint:** `PATCH /todos/99999`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```json
{
  "completed": true
}
```

**Expected Response**
```
Status: 404 Not Found
Body: { "error": "Todo not found" }
```

---

### TC-TODO-UPDATE-06 — 인증 없이 수정 실패

- [ ] **Endpoint:** `PATCH /todos/1`
- [ ] **Auth:** 없음

**Expected Response**
```
Status: 401 Unauthorized
```

---

## 10. Todo 삭제

> 관련 요구사항: FR-06, US-07

---

### TC-TODO-DELETE-01 — 내 Todo 삭제 성공

- [ ] **Endpoint:** `DELETE /todos/:id`
- [ ] **Auth:** `Bearer <JWT>`

**Request**
```
DELETE /todos/1
Authorization: Bearer <token>
```

**Expected Response**
```
Status: 204 No Content
Body: (없음)
```

**검증 포인트**
- [ ] 이후 `GET /todos/1` 요청 시 404가 반환된다

---

### TC-TODO-DELETE-02 — 존재하지 않는 Todo 삭제 실패

- [ ] **Endpoint:** `DELETE /todos/99999`
- [ ] **Auth:** `Bearer <JWT>`

**Expected Response**
```
Status: 404 Not Found
Body: { "error": "Todo not found" }
```

---

### TC-TODO-DELETE-03 — 인증 없이 삭제 실패

- [ ] **Endpoint:** `DELETE /todos/1`
- [ ] **Auth:** 없음

**Expected Response**
```
Status: 401 Unauthorized
```

---

## 11. 데이터 격리 — 타 사용자 접근 차단

> 관련 요구사항: FR-06, 비기능 요구사항(보안), US-04

---

### TC-ISOLATION-01 — 타 사용자의 Todo 단건 조회 차단

- [ ] **사전 조건:** alice가 Todo(id=1)를 소유, bob이 로그인하여 JWT 보유

**Request**
```
GET /todos/1
Authorization: Bearer <bob의 JWT>
```

**Expected Response**
```
Status: 404 Not Found
Body: { "error": "Todo not found" }
```

> 403 대신 404를 반환하여 리소스 존재 여부를 노출하지 않는다.

---

### TC-ISOLATION-02 — 타 사용자의 Todo 수정 차단

- [ ] **사전 조건:** alice의 Todo(id=1) 존재

**Request**
```
PATCH /todos/1
Authorization: Bearer <bob의 JWT>

{ "completed": true }
```

**Expected Response**
```
Status: 404 Not Found
Body: { "error": "Todo not found" }
```

---

### TC-ISOLATION-03 — 타 사용자의 Todo 삭제 차단

- [ ] **사전 조건:** alice의 Todo(id=1) 존재

**Request**
```
DELETE /todos/1
Authorization: Bearer <bob의 JWT>
```

**Expected Response**
```
Status: 404 Not Found
Body: { "error": "Todo not found" }
```

---

### TC-ISOLATION-04 — Todo 목록은 본인 것만 반환

- [ ] **사전 조건:** alice에게 Todo 3개, bob에게 Todo 2개 존재

**Request**
```
GET /todos
Authorization: Bearer <bob의 JWT>
```

**Expected Response**
```
Status: 200 OK
Body: (bob의 Todo 2개만 포함된 배열, alice의 항목 없음)
```

---

## 테스트 케이스 요약

| 그룹 | 케이스 수 | 성공 케이스 | 실패 케이스 |
|------|-----------|-------------|-------------|
| 서버 상태 | 1 | 1 | 0 |
| 회원가입 | 6 | 2 | 4 |
| 로그인 | 4 | 1 | 3 |
| 접근 제어 | 3 | 0 | 3 |
| 프로필 조회 | 2 | 1 | 1 |
| Todo 생성 | 6 | 2 | 4 |
| Todo 목록 조회 | 8 | 8 | 0 |
| Todo 단건 조회 | 3 | 1 | 2 |
| Todo 수정 | 6 | 3 | 3 |
| Todo 삭제 | 3 | 1 | 2 |
| 데이터 격리 | 4 | 0 | 4 |
| **합계** | **46** | **20** | **26** |
