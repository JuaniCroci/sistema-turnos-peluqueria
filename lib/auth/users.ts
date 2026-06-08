import { getDb } from '@/lib/db/connection';
import type { Role } from '@/lib/types';

export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  role: Role;
}

export const findUserByEmail = (email: string): UserRow | undefined => {
  const db = getDb();
  return db
    .prepare(
      'SELECT id, email, username, password_hash, role FROM users WHERE email = ?',
    )
    .get(email.toLowerCase()) as UserRow | undefined;
};

export const findUserByUsername = (username: string): UserRow | undefined => {
  const db = getDb();
  return db
    .prepare(
      'SELECT id, email, username, password_hash, role FROM users WHERE username = ?',
    )
    .get(username) as UserRow | undefined;
};

export const findUserById = (id: number): UserRow | undefined => {
  const db = getDb();
  return db
    .prepare(
      'SELECT id, email, username, password_hash, role FROM users WHERE id = ?',
    )
    .get(id) as UserRow | undefined;
};

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
  role?: Role;
}

export interface PublicUserRow {
  id: number;
  email: string;
  username: string;
  role: Role;
  created_at: string;
}

export const listAllUsers = (): PublicUserRow[] => {
  const db = getDb();
  return db
    .prepare('SELECT id, email, username, role, created_at FROM users ORDER BY created_at DESC')
    .all() as PublicUserRow[];
};

export const createUser = (input: CreateUserInput): UserRow => {
  const db = getDb();
  const role: Role = input.role ?? 'client';
  const result = db
    .prepare(
      'INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)',
    )
    .run(input.email.toLowerCase(), input.username, input.passwordHash, role);
  const id = Number(result.lastInsertRowid);
  const user = findUserById(id);
  if (!user) {
    throw new Error('No se encontro el usuario recien creado');
  }
  return user;
};
