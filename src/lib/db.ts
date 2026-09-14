import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

/**
 * Storage: libSQL (Turso's client), which speaks the same SQL/params as
 * SQLite whether it's pointed at:
 *   - a local file (no network, no account — this is what local dev and
 *     `npm run test:state-machine` use), or
 *   - a real Turso cloud database (what production on Vercel uses, so data
 *     survives redeploys — unlike a local file on Vercel's ephemeral /tmp).
 *
 * Same code path either way. Set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) to
 * go remote; leave them unset to use a local file automatically.
 */
const DB_PATH =
  process.env.DATABASE_PATH ??
  (process.env.VERCEL ? "/tmp/callwaka.db" : path.join(process.cwd(), "data", "callwaka.db"));

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var __callwakaDb: Client | undefined;
  // eslint-disable-next-line no-var
  var __callwakaDbReady: Promise<void> | undefined;
}

function createConnection(): Client {
  const remoteUrl = process.env.TURSO_DATABASE_URL;

  if (remoteUrl) {
    return createClient({ url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN });
  }

  // No Turso credentials configured -> use a local file. Identical client,
  // identical SQL, zero network calls. This is also what CI/tests run against.
  ensureDir(DB_PATH);
  return createClient({ url: `file:${DB_PATH}` });
}

async function migrate(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'tracking',
      counterparty_name TEXT NOT NULL,
      counterparty_phone TEXT NOT NULL,
      user_phone TEXT,
      reference_number TEXT DEFAULT '',
      escalation_count INTEGER NOT NULL DEFAULT 0,
      escalation_limit INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commitments (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      source_call_id TEXT,
      description TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      verification_method TEXT NOT NULL DEFAULT 'user_confirm',
      sequence INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      commitment_id TEXT,
      purpose TEXT NOT NULL, -- 'initial' | 'verification' | 'escalation'
      calle_call_id TEXT,
      to_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'preparing',
      outcome TEXT,
      summary TEXT,
      transcript TEXT,
      structured_result TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      call_id TEXT,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_commitments_case ON commitments(case_id);
    CREATE INDEX IF NOT EXISTS idx_commitments_due ON commitments(status, due_at);
    CREATE INDEX IF NOT EXISTS idx_calls_case ON calls(case_id);
    CREATE INDEX IF NOT EXISTS idx_calls_calle_id ON calls(calle_call_id);
    CREATE INDEX IF NOT EXISTS idx_events_case ON events(case_id);
  `);
}

/** Always await this before running any query — ensures the schema exists first, exactly once. */
export async function getDb(): Promise<Client> {
  if (!globalThis.__callwakaDb) {
    globalThis.__callwakaDb = createConnection();
    globalThis.__callwakaDbReady = migrate(globalThis.__callwakaDb);
  }
  await globalThis.__callwakaDbReady;
  return globalThis.__callwakaDb;
}


