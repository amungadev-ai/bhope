CREATE TABLE IF NOT EXISTS ai_access (
  user_id VARCHAR(36) PRIMARY KEY,
  free_used INTEGER NOT NULL DEFAULT 0,
  paid_until VARCHAR(30),
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ai_access_events (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  actor_id VARCHAR(36) NOT NULL,
  paid_until VARCHAR(30),
  reason VARCHAR(500) NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);
