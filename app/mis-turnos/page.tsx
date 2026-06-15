'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import type { AppointmentAdminRow } from '@/lib/db/appointments';
import { formatLongDate, formatTime, formatPrice } from '@/lib/utils/format';
import styles from './MyAppointments.module.css';

const statusConfig: Record<
  string,
  { tone: 'warning' | 'success' | 'neutral' | 'danger' | 'info'; label: string }
> = {
  pending: { tone: 'warning', label: 'Pendiente' },
  confirmed: { tone: 'success', label: 'Confirmado' },
  cancelled: { tone: 'neutral', label: 'Cancelado' },
  completed: { tone: 'info', label: 'Completado' },
};

const getStatusConfig = (status: string) => {
  return statusConfig[status] ?? { tone: 'neutral' as const, label: status };
};

export default function MyAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?page=${p}&limit=20`);
      if (!res.ok) throw new Error('Error al cargar turnos');
      const json = await res.json();
      setAppointments(json.data ?? []);
      setTotalPages(
        Math.max(
          1,
          Math.ceil(
            (json.pagination?.total ?? 0) / (json.pagination?.limit ?? 20),
          ),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments(page);
  }, [fetchAppointments, page]);

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancelar este turno?')) return;
    setActionError(null);
    setCancelling(id);
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error?.message ?? 'Error al cancelar');
        return;
      }
      await fetchAppointments(page);
    } catch {
      setActionError('Error al cancelar turno');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Mis turnos</h1>
            <p className={styles.subtitle}>Historial de tus reservas</p>
          </div>
        </div>

        {actionError && (
          <div className={styles.errorBox}>
            <AlertCircle size={16} aria-hidden="true" />
            {actionError}
          </div>
        )}

        {loading && appointments.length === 0 ? (
          <p className={styles.loading}>Cargando turnos...</p>
        ) : error ? (
          <div className={styles.errorBox}>
            <AlertCircle size={16} aria-hidden="true" />
            {error}
          </div>
        ) : appointments.length === 0 ? (
          <div className={styles.empty}>
            <Calendar
              size={48}
              className={styles.emptyIcon}
              aria-hidden="true"
            />
            <p className={styles.emptyTitle}>Sin turnos</p>
            <p className={styles.emptyDesc}>
              Todavia no reservaste ningun turno.
            </p>
            <Button onClick={() => router.push('/mis-turnos/nuevo')}>
              Reservar turno
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {appointments.map((apt) => {
                const cfg = getStatusConfig(apt.status);
                const canCancel =
                  apt.status === 'pending' || apt.status === 'confirmed';
                return (
                  <div
                    key={apt.id}
                    className={`${styles.card} ${apt.status === 'cancelled' ? styles.cancelledCard : ''}`}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.serviceInfo}>
                        <h3 className={styles.serviceName}>
                          {apt.service_name}
                        </h3>
                        {apt.category_name && (
                          <span className={styles.categoryName}>
                            {apt.category_name}
                          </span>
                        )}
                      </div>
                      <Badge tone={cfg.tone}>{cfg.label}</Badge>
                    </div>

                    <div className={styles.cardMeta}>
                      <span className={styles.metaItem}>
                        <Calendar size={14} aria-hidden="true" />
                        {formatLongDate(apt.appointment_at)}
                      </span>
                      <span className={styles.metaItem}>
                        <Clock size={14} aria-hidden="true" />
                        {formatTime(apt.appointment_at)}
                      </span>
                      <span className={styles.metaItem}>
                        {formatPrice(apt.service_price_cents)}
                      </span>
                    </div>

                    {apt.notes && <p className={styles.notes}>{apt.notes}</p>}

                    {canCancel && (
                      <div className={styles.cardActions}>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={cancelling === apt.id}
                          onClick={() => handleCancel(apt.id)}
                          iconLeft={<XCircle size={14} />}
                        >
                          Cancelar turno
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav className={styles.pagination} aria-label="Paginacion">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  iconLeft={<ChevronLeft size={14} />}
                >
                  Anterior
                </Button>
                <span className={styles.pageInfo}>
                  Pagina {page} de {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  iconRight={<ChevronRight size={14} />}
                >
                  Siguiente
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
