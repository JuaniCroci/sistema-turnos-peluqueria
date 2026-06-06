import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@/lib/types';

export const authEdgeConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = Number(user.id);
        token.role = (user as { role: Role }).role;
        token.username = (user as { name?: string }).name ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.id as number,
            role: token.role as Role,
            username: (token.username as string | null) ?? null,
          },
        };
      }
      return session;
    },
    authorized: async ({ auth, request }) => {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);
      const isAdmin = auth?.user?.role === 'admin';

      if (pathname.startsWith('/admin')) {
        return isAdmin;
      }
      if (pathname.startsWith('/mis-turnos')) {
        return isLoggedIn;
      }
      return true;
    },
  },
};
