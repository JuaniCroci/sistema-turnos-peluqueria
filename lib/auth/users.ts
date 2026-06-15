import { getDb } from '@/lib/db/connection';
import { hashPassword } from '@/lib/utils/password';
import type { Role } from '@/lib/types';

export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  role: Role;
}

export const findUserByEmail = async (
  email: string,
): Promise<UserRow | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('id, email, username, password_hash, role')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | undefined) ?? undefined;
};

export const findUserByUsername = async (
  username: string,
): Promise<UserRow | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('id, email, username, password_hash, role')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | undefined) ?? undefined;
};

export const findUserById = async (
  id: number,
): Promise<UserRow | undefined> => {
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
  ip_address?: string | null;
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
      ip_address: input.ip_address ?? null,
    })
    .select('id, email, username, password_hash, role')
    .single();

  if (error) throw error;
  return data as UserRow;
};

export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_REGISTRATIONS_PER_IP = 4;

export const countRecentRegistrationsByIp = async (
  ip: string,
): Promise<number> => {
  const db = getDb();
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const { count, error } = await db
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since);
  if (error) throw error;
  return count ?? 0;
};

const generateUniqueUsername = async (base: string): Promise<string> => {
  let username = base.replace(/[^a-z0-9_.-]/g, '').slice(0, 40) || 'usuario';
  let suffix = 0;
  while (await findUserByUsername(username)) {
    suffix++;
    const suffixStr = String(suffix);
    username = `${base.slice(0, 40 - suffixStr.length)}${suffixStr}`;
  }
  return username;
};

export const findOrCreateGoogleUser = async (
  email: string,
  name?: string | null,
  ip_address?: string | null,
): Promise<UserRow> => {
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  const baseName = (name ?? email.split('@')[0] ?? 'usuario').toLowerCase();
  const username = await generateUniqueUsername(baseName);
  const placeholderHash = hashPassword(crypto.randomUUID());

  return createUser({
    email,
    username,
    passwordHash: placeholderHash,
    role: 'client',
    ip_address,
  });
};
