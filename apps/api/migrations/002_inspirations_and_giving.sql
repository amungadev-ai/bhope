CREATE TABLE IF NOT EXISTS inspirations (
  id VARCHAR(80) PRIMARY KEY,
  payload MEDIUMTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  publish_at VARCHAR(30),
  author_id VARCHAR(36) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS donations (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  idempotency_key VARCHAR(80) NOT NULL UNIQUE,
  token_hash VARCHAR(64) NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  method VARCHAR(12) NOT NULL,
  status VARCHAR(16) NOT NULL,
  reference VARCHAR(100) NOT NULL UNIQUE,
  provider_ref VARCHAR(150),
  checkout_url TEXT,
  last_checked_at VARCHAR(30),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
