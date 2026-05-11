-- Migration: Case-insensitive unique email index for users table
-- If existing duplicate emails are found, they will be soft-renamed before index creation.

-- Step 1: Normalize all emails to lowercase
UPDATE users SET email = LOWER(email) WHERE email <> LOWER(email);

-- Step 2: Defensive dedupe — keep the oldest row, soft-rename duplicates
-- Renames the email on duplicate rows so the unique index can be created cleanly.
-- Duplicate rows remain in the DB for audit; staff can review and clean up later.
WITH dupes AS (
    SELECT id, email,
           ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at) AS rn
    FROM users
    WHERE email IS NOT NULL AND email <> ''
)
UPDATE users u
   SET is_active = false,
       email = LOWER(u.email) || '.dup.' || u.id
  FROM dupes d
 WHERE u.id = d.id AND d.rn > 1;

-- Step 3: Create functional unique index (case-insensitive) with CONCURRENTLY to avoid table lock.
-- IF NOT EXISTS prevents error if the index already exists (idempotent migration).
-- NOTE: CONCURRENTLY cannot run inside a transaction block; this is intentional.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_lower_key
  ON users (LOWER(email));
