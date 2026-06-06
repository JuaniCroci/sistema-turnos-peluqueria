import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { verifyPassword } from '@/lib/utils/password';
import { findUserByEmail } from '@/lib/auth/users';
import { authEdgeConfig } from './config.edge';

const credentialsSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

const authorize = (raw: unknown) => {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const { email, password } = parsed.data;

  const user = findUserByEmail(email.toLowerCase());
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

export const authConfig = {
  ...authEdgeConfig,
  providers: [
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
