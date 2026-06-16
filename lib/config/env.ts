import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL es requerida'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY es requerida'),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  RECAPTCHA_SECRET_KEY: z.string().optional().default(''),
  RECAPTCHA_REQUIRED: z.string().optional().default('false'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  AUTH_SECRET: z.string().optional().default(''),
  NEXTAUTH_URL: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues
    .filter((i) => i.code === 'invalid_type' || i.message.includes('requerida'))
    .map((i) => i.path.join('.'));
  throw new Error(
    `Variables de entorno faltantes o inválidas: ${missing.join(', ')}. Revisá .env.example.`,
  );
}

export const env = parsed.data;
