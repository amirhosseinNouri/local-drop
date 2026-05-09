import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export const DATA_DIR = path.join(process.cwd(), ".localdrop");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.join(DATA_DIR, "data.db");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('file', 'text')),
    name TEXT NOT NULL,
    content TEXT,
    mime TEXT,
    size INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

export type Item = {
  id: string;
  kind: "file" | "text";
  name: string;
  content: string | null;
  mime: string | null;
  size: number;
  created_at: number;
};

export const stmts = {
  insert: db.prepare(
    `INSERT INTO items (id, kind, name, content, mime, size, created_at)
     VALUES (@id, @kind, @name, @content, @mime, @size, @created_at)`,
  ),
  list: db.prepare(`SELECT * FROM items ORDER BY created_at DESC`),
  get: db.prepare(`SELECT * FROM items WHERE id = ?`),
  remove: db.prepare(`DELETE FROM items WHERE id = ?`),
};

export default db;
