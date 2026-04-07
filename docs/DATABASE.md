# Database Documentation

## 1. Overview

| 항목 | 내용 |
|------|------|
| DBMS | PostgreSQL 16 |
| 인코딩 | UTF-8 |
| 타임존 | UTC (TIMESTAMPTZ 사용) |
| 초기화 스크립트 | `db/init.sql` |

---

## 2. ER 다이어그램

```
┌─────────────────────────┐        ┌─────────────────────────────────┐
│          users           │        │              todos               │
├──────────┬──────────────┤        ├───────────┬─────────────────────┤
│ id       │ SERIAL PK    │◀───┐   │ id        │ SERIAL PK           │
│ email    │ VARCHAR(255) │    │   │ user_id   │ INTEGER FK → users  │
│ password │ VARCHAR(255) │    └───│ title     │ VARCHAR(500)        │
│ name     │ VARCHAR(255) │        │ description│ TEXT               │
│ created_at│ TIMESTAMPTZ│        │ completed │ BOOLEAN             │
└──────────┴──────────────┘        │ priority  │ VARCHAR(10)         │
                                   │ due_date  │ DATE                │
                                   │ created_at│ TIMESTAMPTZ         │
                                   │ updated_at│ TIMESTAMPTZ         │
                                   └───────────┴─────────────────────┘
```

관계: **users 1 : N todos** (한 사용자는 여러 Todo를 가질 수 있다)

---

## 3. 테이블 상세

### 3.1 `users`

사용자 계정 정보를 저장한다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | `SERIAL` | PK | 자동 증가 기본 키 |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | 로그인에 사용되는 고유 이메일 |
| `password` | `VARCHAR(255)` | NOT NULL | bcrypt 해시 (평문 저장 금지) |
| `name` | `VARCHAR(255)` | NULL 허용 | 사용자 표시 이름 |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | 계정 생성 시각 (UTC) |

**인덱스**

| 인덱스 | 컬럼 | 종류 |
|--------|------|------|
| `users_pkey` | `id` | Primary Key (자동 생성) |
| `users_email_key` | `email` | Unique (자동 생성) |

---

### 3.2 `todos`

사용자의 할 일 항목을 저장한다.

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|------|------|------|--------|------|
| `id` | `SERIAL` | PK | — | 자동 증가 기본 키 |
| `user_id` | `INTEGER` | NOT NULL, FK | — | 소유자 (users.id 참조) |
| `title` | `VARCHAR(500)` | NOT NULL | — | 할 일 제목 |
| `description` | `TEXT` | NULL 허용 | NULL | 상세 설명 |
| `completed` | `BOOLEAN` | — | `FALSE` | 완료 여부 |
| `priority` | `VARCHAR(10)` | CHECK | `'medium'` | 우선순위: `low` / `medium` / `high` |
| `due_date` | `DATE` | NULL 허용 | NULL | 마감일 |
| `created_at` | `TIMESTAMPTZ` | — | `NOW()` | 생성 시각 (UTC) |
| `updated_at` | `TIMESTAMPTZ` | — | `NOW()` | 최종 수정 시각 (트리거 자동 갱신) |

**제약 조건**

| 제약 | 정의 |
|------|------|
| FK | `user_id REFERENCES users(id) ON DELETE CASCADE` — 사용자 삭제 시 소속 Todo 자동 삭제 |
| CHECK | `priority IN ('low', 'medium', 'high')` |

**인덱스**

| 인덱스 | 컬럼 | 종류 |
|--------|------|------|
| `todos_pkey` | `id` | Primary Key |

> 필요에 따라 `(user_id, completed)`, `(user_id, priority)` 복합 인덱스를 추가하면 필터링 성능을 향상시킬 수 있다.

---

## 4. 트리거

### `todos_updated_at`

`todos` 테이블의 행이 UPDATE될 때 `updated_at`을 자동으로 `NOW()`로 갱신한다.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 5. 초기화

### 5.1 Docker (자동)

`docker-compose up` 실행 시 PostgreSQL 컨테이너가 기동되면서  
`db/init.sql`이 `/docker-entrypoint-initdb.d/`에 마운트되어 **자동으로 실행**된다.  
(데이터 볼륨이 비어 있을 때만 실행됨)

### 5.2 수동 실행

```bash
psql -U todo_user -d todos -f db/init.sql
```

---

## 6. 연결 설정

`DATABASE_URL` 환경변수 형식:

```
postgresql://<user>:<password>@<host>:<port>/<database>
```

**예시 (Docker Compose 내부)**
```
postgresql://todo_user:todo_pass@db:5432/todos
```

**예시 (로컬 개발)**
```
postgresql://todo_user:todo_pass@localhost:5432/todos
```

`src/config/db.js`에서 `pg.Pool`이 이 URL을 사용하며, 연결 오류 시 프로세스가 종료된다.

---

## 7. 데이터 예시

### users

| id | email | name | created_at |
|----|-------|------|------------|
| 1 | alice@company.com | Alice | 2026-04-07 09:00:00+00 |
| 2 | bob@company.com | Bob | 2026-04-07 09:05:00+00 |

### todos

| id | user_id | title | completed | priority | due_date | created_at |
|----|---------|-------|-----------|----------|----------|------------|
| 1 | 1 | API 문서 작성 | false | high | 2026-04-10 | 2026-04-07 09:10:00+00 |
| 2 | 1 | 코드 리뷰 | true | medium | NULL | 2026-04-07 09:15:00+00 |
| 3 | 2 | 배포 테스트 | false | high | 2026-04-08 | 2026-04-07 09:20:00+00 |

---

## 8. 백업 (권장)

Docker 볼륨 `pg_data`에 데이터가 저장된다. 정기 백업 예시:

```bash
# 덤프
docker exec <db_container> pg_dump -U todo_user todos > backup_$(date +%Y%m%d).sql

# 복원
docker exec -i <db_container> psql -U todo_user todos < backup_20260407.sql
```
