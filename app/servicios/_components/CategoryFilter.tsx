'use client';

import { useCallback } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import styles from '../ServicesList.module.css';

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  service_count: number;
}

interface CategoryFilterProps {
  categories: CategoryOption[];
  current: string | undefined;
}

export const CategoryFilter = ({ categories, current }: CategoryFilterProps) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const form = (e.target as HTMLElement).closest('form');
      if (form) {
        const qInput = form.querySelector<HTMLInputElement>('input[name="q"]');
        if (qInput) {
          const params = new URLSearchParams();
          if (e.target.value) params.set('category', e.target.value);
          if (qInput.value) params.set('q', qInput.value);
          const qs = params.toString();
          window.location.href = `/servicios${qs ? `?${qs}` : ''}`;
        }
      }
    },
    [],
  );

  return (
    <div className={styles.filterWrapper}>
      <SlidersHorizontal size={16} className={styles.filterIcon} aria-hidden="true" />
      <select
        name="category"
        defaultValue={current ?? ''}
        className={styles.filterSelect}
        aria-label="Filtrar por categoria"
        onChange={handleChange}
      >
        <option value="">Todas las categorias</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.slug}>
            {cat.name} ({cat.service_count})
          </option>
        ))}
      </select>
    </div>
  );
};
