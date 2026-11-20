DELETE FROM sessions;

ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER email,
  ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN locked_until DATETIME NULL,
  DROP COLUMN google_sub;
