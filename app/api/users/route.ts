import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listAllUsers } from '@/lib/auth/users';
import { errorResponse } from '@/lib/utils/api';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }
    if (session.user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Se requiere rol admin');
    }

    const users = await listAllUsers();
    return NextResponse.json({ data: users });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener usuarios');
  }
}
