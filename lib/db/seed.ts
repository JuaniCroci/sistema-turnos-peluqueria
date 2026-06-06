import type Database from 'better-sqlite3';
import { hashPassword } from '@/lib/utils/password';

interface SeedCategory {
  name: string;
  slug: string;
  description: string;
}

interface SeedService {
  categorySlug: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
}

const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Cabello', slug: 'cabello', description: 'Cortes y peinados para todos.' },
  { name: 'Barba', slug: 'barba', description: 'Perfilado, diseño y cuidado de barba.' },
  { name: 'Coloración', slug: 'coloracion', description: 'Tintes, color completo y mechas.' },
  { name: 'Tratamientos', slug: 'tratamientos', description: 'Hidratación, keratina y más.' },
];

const SEED_SERVICES: SeedService[] = [
  { categorySlug: 'cabello', name: 'Corte caballero', description: 'Corte clásico de caballero.', duration_minutes: 30, price_cents: 300000 },
  { categorySlug: 'cabello', name: 'Corte dama', description: 'Corte y lavado para dama.', duration_minutes: 45, price_cents: 500000 },
  { categorySlug: 'cabello', name: 'Corte niño', description: 'Corte para niños hasta 12 años.', duration_minutes: 20, price_cents: 200000 },
  { categorySlug: 'barba', name: 'Perfilado de barba', description: 'Perfilado y diseño de barba.', duration_minutes: 20, price_cents: 200000 },
  { categorySlug: 'barba', name: 'Barba completa', description: 'Perfilado, toalla caliente y aceite.', duration_minutes: 30, price_cents: 350000 },
  { categorySlug: 'coloracion', name: 'Tinte de raíces', description: 'Cobertura de raíces y tono.', duration_minutes: 60, price_cents: 800000 },
  { categorySlug: 'coloracion', name: 'Color completo', description: 'Color completo en todo el cabello.', duration_minutes: 90, price_cents: 1200000 },
  { categorySlug: 'tratamientos', name: 'Hidratación', description: 'Hidratación profunda con ampolleta.', duration_minutes: 40, price_cents: 600000 },
  { categorySlug: 'tratamientos', name: 'Keratina', description: 'Alisado con keratina y sellado.', duration_minutes: 120, price_cents: 1800000 },
];

export const seedIfEmpty = (db: Database.Database): void => {
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (row.count > 0) {
    return;
  }

  const insertUser = db.prepare(
    'INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)',
  );
  const insertCategory = db.prepare(
    'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
  );
  const insertService = db.prepare(
    `INSERT INTO services
       (category_id, name, description, duration_minutes, price_cents, active)
     VALUES (?, ?, ?, ?, ?, 1)`,
  );

  const adminHash = hashPassword('admin123');
  const clientHash = hashPassword('1234');

  db.exec('BEGIN');
  try {
    insertUser.run('admin@barberia.test', 'admin', adminHash, 'admin');
    insertUser.run('juani@test.com', 'juani', clientHash, 'client');

    const slugToId = new Map<string, number>();
    for (const cat of SEED_CATEGORIES) {
      const result = insertCategory.run(cat.name, cat.slug, cat.description);
      slugToId.set(cat.slug, Number(result.lastInsertRowid));
    }

    for (const svc of SEED_SERVICES) {
      const categoryId = slugToId.get(svc.categorySlug);
      if (categoryId === undefined) {
        throw new Error(`Seed inconsistente: categoria ${svc.categorySlug} no encontrada`);
      }
      insertService.run(categoryId, svc.name, svc.description, svc.duration_minutes, svc.price_cents);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};
