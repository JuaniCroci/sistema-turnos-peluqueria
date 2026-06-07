import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { MIGRATIONS } from './migrations';
import { seedIfEmpty } from './seed';

const globalForDb = globalThis as unknown as { __turnosDb?: Database.Database };

const openDatabase = (): Database.Database => {
  const dbPath = process.env.DB_PATH ?? './data/turnos.db';
  const absPath = resolve(dbPath);
  mkdirSync(dirname(absPath), { recursive: true });

  const db = new Database(absPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
};

const initSchema = (db: Database.Database): void => {
  db.exec('BEGIN');
  try {
    for (const sql of MIGRATIONS) {
      db.exec(sql);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

export const getDb = (): Database.Database => {
  if (globalForDb.__turnosDb) {
    return globalForDb.__turnosDb;
  }
  const db = openDatabase();
  initSchema(db);
  seedIfEmpty(db);
  globalForDb.__turnosDb = db;
  return db;
};

// Warm-up: inicializa la DB al importar el módulo para que la primera
// request no pague cold start (migraciones + seed).
getDb();
