import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { NextAuthConfig } from 'next-auth';
import { verifyPassword } from '@/lib/utils/password';
import { findUserByEmail, findOrCreateGoogleUser } from '@/lib/auth/users';
import { authEdgeConfig } from './config.edge';
import type { Role } from '@/lib/types';

const credentialsSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

const authorize = async (raw: unknown) => {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const { email, password } = parsed.data;

  const user = await findUserByEmail(email.toLowerCase());
  if (!user) {
    return null;
  }
  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }
  return {
    id: String(user.id),
    email: user.email,
    name: user.username,
    role: user.role,
  };
};

export const authConfig: NextAuthConfig = {
  ...authEdgeConfig,
  callbacks: {
    ...authEdgeConfig.callbacks,
    signIn: async ({ user, account }) => {
      if (account?.provider === 'google') {
        try {
          const dbUser = await findOrCreateGoogleUser(user.email ?? '', user.name);
          user.id = String(dbUser.id);
          user.name = dbUser.username;
          (user as { role: Role }).role = dbUser.role;
        } catch (err) {
          console.error('[auth/google] signIn error:', err);
          return false;
        }
      }
      return true;
    },
  },
  providers: [
    ...(authEdgeConfig.providers ?? []),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize,
    }),
  ],
};
