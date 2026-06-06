import { StubPage } from '@/components/StubPage/StubPage';

export default function RegisterPage() {
  return (
    <StubPage
      title="Crear cuenta"
      milestone="M2 · Auth (NextAuth v5)"
      description="Formulario de registro con email, username y password. Server Action que valida con Zod y crea el user con bcryptjs."
    />
  );
}
