const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = value !== undefined && value !== '' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: toInt(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'cambiame-en-prod',
  dbPath: process.env.DB_PATH ?? './data/turnos.db',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
