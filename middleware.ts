import NextAuth from 'next-auth';
import { authEdgeConfig } from '@/lib/auth/config.edge';

export const { auth: middleware } = NextAuth(authEdgeConfig);

export const config = {
  matcher: ['/mis-turnos/:path*', '/admin/:path*'],
};
