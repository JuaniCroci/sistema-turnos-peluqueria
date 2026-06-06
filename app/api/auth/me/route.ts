import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/utils/api';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return errorResponse('UNAUTHORIZED', 'No autenticado');
  }
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role,
    },
  });
}
