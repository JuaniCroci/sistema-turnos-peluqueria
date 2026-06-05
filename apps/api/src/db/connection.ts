import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { env } from '../config/env.js';

const dbPath = isAbsolute(env.dbPath) ? env.dbPath : resolve(process.cwd(), env.dbPath);

mkdirSync(dirname(dbPath), { recursive: true });

export const db: DatabaseType = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
