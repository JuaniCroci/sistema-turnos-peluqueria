import { cache } from 'react';
import NextAuth from 'next-auth';
import { authConfig } from './config';

const { handlers, auth: originalAuth, signIn, signOut } = NextAuth(authConfig);

export const auth = cache(originalAuth);
export { handlers, signIn, signOut };
