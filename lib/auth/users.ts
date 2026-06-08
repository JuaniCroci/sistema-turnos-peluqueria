import { getDb } from '@/lib/db/connection';
import type { Role } from '@/lib/types';

export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  role: Role;
}

export const findUserByEmail = async (email: string): Promise<UserRow | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('id, email, username, password_hash, role')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | undefined) ?? undefined;
};

export const findUserByUsername = async (username: string): Promise<UserRow | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('id, email, username, password_hash, role')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | undefined) ?? undefined;
};

export const findUserById = async (id: number): Promise<UserRow | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('id, email, username, password_hash, role')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | undefined) ?? undefined;
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

export const listAllUsers = async (): Promise<PublicUserRow[]> => {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('id, email, username, role, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublicUserRow[];
};

export const createUser = async (input: CreateUserInput): Promise<UserRow> => {
  const db = getDb();
  const role: Role = input.role ?? 'client';

  const { data, error } = await db
    .from('users')
    .insert({
      email: input.email.toLowerCase(),
      username: input.username,
      password_hash: input.passwordHash,
      role,
    })
    .select('id, email, username, password_hash, role')
    .single();

  if (error) throw error;
  return data as UserRow;
};
