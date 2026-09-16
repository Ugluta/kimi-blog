// PostgreSQL bağlantı havuzu + şema başlatma
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // pgBouncer Faz 2'de; burada yerleşik havuz
  idleTimeoutMillis: 30000,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',   -- admin | editor | member
      plan_id INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS conversions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'mor',
      ratio TEXT NOT NULL DEFAULT '16:9',
      status TEXT NOT NULL DEFAULT 'queued', -- queued | rendering | done | error
      input_path TEXT,
      output_url TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      finished_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS publish_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversion_id UUID REFERENCES conversions(id),
      platforms TEXT[] NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      results JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_conversions_user ON conversions(user_id);
  `);
  console.log('[db] şema hazır');
}

module.exports = { pool, init };
