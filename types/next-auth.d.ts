import type { DefaultSession } from 'next-auth';
import type { Role } from '@/lib/types';

type AppUser = {
  id: number;
  email: string | null;
  name: string | null;
  image: string | null;
  role: Role;
  username: string | null;
};

declare module 'next-auth' {
  interface Session {
    user: AppUser;
  }

  interface User {
    role: Role;
  }
}
