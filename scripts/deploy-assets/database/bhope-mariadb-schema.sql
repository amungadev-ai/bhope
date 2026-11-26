-- Beacon of Hope API — MariaDB/MySQL schema + devotional seeds
-- Generated from apps/api/migrations/*.sql by scripts/gen-mariadb-schema.mjs.
-- Import ONCE into the app database via phpMyAdmin (choose the app database first).
-- Safe to re-import: CREATE TABLE IF NOT EXISTS, seeds only fill an empty library.
SET NAMES utf8mb4;

-- ---- 001_initial.sql ----
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  expires_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS devotionals (
  id VARCHAR(80) PRIMARY KEY,
  payload MEDIUMTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  publish_at VARCHAR(30),
  author_id VARCHAR(36),
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(80) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  payload MEDIUMTEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at VARCHAR(30) NOT NULL,
  PRIMARY KEY (id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS daily_ai_usage (
  user_id VARCHAR(36) NOT NULL,
  day VARCHAR(10) NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_id VARCHAR(80) NOT NULL,
  created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- 002_inspirations_and_giving.sql ----
CREATE TABLE IF NOT EXISTS inspirations (
  id VARCHAR(80) PRIMARY KEY,
  payload MEDIUMTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  publish_at VARCHAR(30),
  author_id VARCHAR(36) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- 003_ai_access.sql ----
CREATE TABLE IF NOT EXISTS ai_access (
  user_id VARCHAR(36) PRIMARY KEY,
  free_used INTEGER NOT NULL DEFAULT 0,
  paid_until VARCHAR(30),
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ai_access_events (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  actor_id VARCHAR(36) NOT NULL,
  paid_until VARCHAR(30),
  reason VARCHAR(500) NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- devotional seeds (only effective while the library is empty) ----
INSERT INTO devotionals (id, payload, status, publish_at, author_id, updated_at)
SELECT * FROM (
SELECT 'hope-for-today', '{"id":"hope-for-today","category":"HOPE","bookId":19,"chapter":23,"verseStart":1,"verseEnd":3,"minutes":4,"en":{"title":"There is hope in the quiet","subtitle":"You do not have to carry tomorrow today.","reflection":"A shepherd leads one step at a time. We often want the whole map: the next opportunity, the answer to our prayer, the way through uncertainty. Psalm 23 invites us to receive something simpler: the presence of God in this moment.\\n\\nRest is not a reward for having everything figured out. It is an invitation to trust the One who knows the path. Today, let one quiet moment interrupt the noise. Notice what you have been carrying alone, and bring it honestly to God.","application":"Take five quiet minutes. Name one worry, write one thing you are grateful for, and choose one small act of kindness.","prayer":"Loving Father, meet me in the ordinary moments of today. Help me receive Your care, walk with courage, and offer hope to someone else. Amen.","question":"Where could you make room for a little more trust today?"},"sw":{"title":"Kuna tumaini katika utulivu","subtitle":"Huhitaji kubeba kesho leo.","reflection":"Mchungaji huongoza hatua kwa hatua. Mara nyingi tunataka kujua njia yote: nafasi inayofuata, jibu la sala, na namna ya kushinda mashaka. Zaburi 23 inatualika kupokea uwepo wa Mungu katika wakati huu.\\n\\nKupumzika si zawadi ya kuwa na majibu yote. Ni mwaliko wa kumwamini anayejua njia. Leo, tenga muda mfupi wa utulivu. Tambua mzigo ulioubeba peke yako, kisha umweleze Mungu kwa uaminifu.","application":"Tenga dakika tano za utulivu. Andika jambo moja linalokutia wasiwasi, jambo moja la kushukuru, na tendo moja la wema utakalochagua.","prayer":"Baba mwenye upendo, kutana nami katika shughuli za leo. Nisaidie kupokea utunzaji Wako, kutembea kwa ujasiri, na kumpa mwingine tumaini. Amina.","question":"Ni sehemu gani ya maisha yako inayohitaji kumwamini Mungu zaidi leo?"}}', 'published', '2026-11-25T17:56:36.528Z', NULL, '2026-11-26T17:56:36.528Z'
UNION ALL
SELECT 'peace-in-the-pause', '{"id":"peace-in-the-pause","category":"PEACE","bookId":50,"chapter":4,"verseStart":6,"verseEnd":7,"minutes":3,"en":{"title":"Peace in the pause","subtitle":"A small invitation to bring your worries to God.","reflection":"Prayer makes room for honesty. You do not need polished words before you can speak to God. Bring the concern that keeps returning to your mind. Alongside it, name a gift you have received. Gratitude does not erase difficulty; it helps us remember that difficulty is not the whole story.","application":"Write a short prayer about one concern, followed by one sentence of thanks.","prayer":"God of peace, help me bring my whole heart to You. Give me patience for this day and wisdom for the next step. Amen.","question":"What would you like to bring to God in prayer?"},"sw":{"title":"Amani katika pumziko","subtitle":"Mwaliko wa kumpelekea Mungu wasiwasi wako.","reflection":"Sala hutupa nafasi ya kusema ukweli. Huhitaji maneno makamilifu ili kuzungumza na Mungu. Mweleze jambo linalorudi akilini mwako. Kisha taja zawadi moja uliyopokea. Shukrani haiondoi magumu, lakini hutukumbusha kuwa magumu si hadithi nzima.","application":"Andika sala fupi kuhusu jambo moja linalokusumbua, kisha ongeza sentensi ya shukrani.","prayer":"Mungu wa amani, nisaidie kuleta moyo wangu wote mbele Zako. Nipe subira ya leo na hekima kwa hatua inayofuata. Amina.","question":"Ungependa kumpelekea Mungu jambo gani katika sala?"}}', 'published', '2026-11-24T17:56:36.528Z', NULL, '2026-11-26T17:56:36.528Z'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM devotionals);
