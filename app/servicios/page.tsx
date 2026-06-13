import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ServiceCard } from '@/components/ServiceCard/ServiceCard';
import { findAllActiveCategoriesWithCount, findServices } from '@/lib/db/services';
import { CategoryFilter } from './_components/CategoryFilter';
import type { Service } from '@/lib/types';
import styles from './ServicesList.module.css';

export const metadata: Metadata = {
  title: 'Servicios · Sistema de Turnos — Peluquería',
  description: 'Explorá nuestros servicios de peluquería: cortes, barba, coloración y tratamientos.',
};

interface ServicesListPageProps {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

export default async function ServicesListPage({ searchParams }: ServicesListPageProps) {
  const { category, q, page: pageStr } = await searchParams;
  const currentPage = Math.max(1, Number(pageStr) || 1);

  const [categories, result] = await Promise.all([
    findAllActiveCategoriesWithCount(),
    findServices({ categorySlug: category, q, page: currentPage, limit: 10 }),
  ]);

  const { data: services, pagination } = result;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextCategory = overrides.category !== undefined ? overrides.category : category;
    const nextQ = overrides.q !== undefined ? overrides.q : q;
    const nextPage = overrides.page !== undefined ? overrides.page : String(currentPage);
    if (nextCategory) params.set('category', nextCategory);
    if (nextQ) params.set('q', nextQ);
    if (nextPage && nextPage !== '1') params.set('page', nextPage);
    const qs = params.toString();
    return `/servicios${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Servicios</h1>
          <p className={styles.subtitle}>
            Elegí el servicio que necesitas y reservá tu turno al instante.
          </p>
        </div>

        <form className={styles.filters} method="GET" action="/servicios" role="search">
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Buscar servicio..."
              className={styles.searchInput}
              aria-label="Buscar servicio"
            />
          </div>

          <CategoryFilter categories={categories} current={category} />

          <button type="submit" className={styles.submitBtn}>Filtrar</button>

          {(q || category) && (
            <Link href="/servicios" className={styles.clearBtn}>
              Limpiar filtros
            </Link>
          )}
        </form>

        {services.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Sin resultados</p>
            <p className={styles.emptyDesc}>
              No encontramos servicios con esos filtros. Intenta con otros terminos.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {services.map((service: Service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className={styles.pagination} aria-label="Paginacion">
                {currentPage > 1 ? (
                  <Link
                    href={buildHref({ page: String(currentPage - 1) })}
                    className={styles.pageBtn}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Anterior
                  </Link>
                ) : (
                  <span />
                )}

                <span className={styles.pageInfo}>
                  Pagina {currentPage} de {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <Link
                    href={buildHref({ page: String(currentPage + 1) })}
                    className={styles.pageBtn}
                  >
                    Siguiente
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
