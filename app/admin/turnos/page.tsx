'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  X,
  RotateCcw,
  Plus,
  Calendar,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { formatPrice } from '@/lib/utils/format';
import type { AppointmentAdminRow } from '@/lib/db/appointments';
import type { AppointmentStatus } from '@/lib/types';
import styles from './AdminAppointments.module.css';

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

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<{
    id: number;
    status: AppointmentStatus;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: `${toDate}T23:59:59`,
        limit: '200',
      } as Record<string, string>);
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/appointments?${params}`);
      if (!res.ok) throw new Error('Error al cargar turnos');
      const json = await res.json();
      const sorted = (json.data ?? []).sort(
        (a: AppointmentAdminRow, b: AppointmentAdminRow) =>
          a.appointment_at.localeCompare(b.appointment_at),
      );
      setAppointments(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStatusChange = async (id: number, status: AppointmentStatus) => {
    setChangingStatus({ id, status });
    setActionError(null);
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error?.message ?? 'Error al actualizar');
        return;
      }
      await fetchAppointments();
    } catch {
      setActionError('Error al actualizar turno');
    } finally {
      setChangingStatus(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este turno cancelado?')) return;
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error?.message ?? 'Error al eliminar');
        return;
      }
      await fetchAppointments();
    } catch {
      setActionError('Error al eliminar turno');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Turnos reservados</h1>
            <p className={styles.subtitle}>
              {appointments.length} turnos en el período seleccionado
            </p>
          </div>
          <Link href="/admin/turnos/nuevo">
            <Button iconLeft={<Calendar size={16} />}>Agendar turno</Button>
          </Link>
        </div>

        {actionError && (
          <div className={styles.errorBox} role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{actionError}</span>
            <button
              className={styles.dismissBtn}
              onClick={() => setActionError(null)}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="filter-from">Desde</label>
            <input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={styles.filterInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="filter-to">Hasta</label>
            <input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={styles.filterInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="filter-status">Estado</label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className={styles.loading}>Cargando turnos...</p>
        ) : error ? (
          <div className={styles.errorBox} role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className={styles.empty}>
            <p>No hay turnos en este período</p>
            <Link href="/admin/turnos/nuevo">
              <Button variant="ghost" iconLeft={<Plus size={16} />}>
                Agregar el primero
              </Button>
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th className={styles.cellDuration}>Duración</th>
                  <th className={styles.cellPrice}>Precio</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => {
                  const cfg = getStatusConfig(apt.status);
                  const isLoading = changingStatus?.id === apt.id;
                  return (
                    <tr key={apt.id}>
                      <td className={styles.cellDate}>
                        {formatDate(apt.appointment_at)}
                      </td>
                      <td className={styles.cellTime}>
                        {formatTime(apt.appointment_at)}
                      </td>
                      <td className={styles.cellClient}>
                        {apt.client_name ??
                          apt.user_username ??
                          apt.user_email ??
                          'Cliente sin cuenta'}
                      </td>
                      <td className={styles.cellService}>{apt.service_name}</td>
                      <td className={styles.cellDuration}>
                        {apt.service_duration_minutes} min
                      </td>
                      <td className={styles.cellPrice}>
                        {formatPrice(apt.service_price_cents)}
                      </td>
                      <td>
                        <Badge tone={cfg.tone}>{cfg.label}</Badge>
                      </td>
                      <td className={styles.cellActions}>
                        {apt.status === 'pending' && (
                          <>
                            <button
                              className={styles.actionBtn}
                              disabled={!!isLoading}
                              onClick={() =>
                                handleStatusChange(apt.id, 'confirmed')
                              }
                              title="Confirmar"
                            >
                              <Check size={16} aria-hidden="true" />
                            </button>
                            <button
                              className={styles.actionBtnDanger}
                              disabled={!!isLoading}
                              onClick={() =>
                                handleStatusChange(apt.id, 'cancelled')
                              }
                              title="Cancelar"
                            >
                              <X size={16} aria-hidden="true" />
                            </button>
                          </>
                        )}
                        {apt.status === 'confirmed' && (
                          <>
                            <button
                              className={styles.actionBtn}
                              disabled={!!isLoading}
                              onClick={() =>
                                handleStatusChange(apt.id, 'completed')
                              }
                              title="Completar"
                            >
                              <Check size={16} aria-hidden="true" />
                            </button>
                            <button
                              className={styles.actionBtnDanger}
                              disabled={!!isLoading}
                              onClick={() =>
                                handleStatusChange(apt.id, 'cancelled')
                              }
                              title="Cancelar"
                            >
                              <X size={16} aria-hidden="true" />
                            </button>
                          </>
                        )}
                        {apt.status === 'cancelled' && (
                          <>
                            <button
                              className={styles.actionBtn}
                              disabled={!!isLoading}
                              onClick={() =>
                                handleStatusChange(apt.id, 'pending')
                              }
                              title="Reabrir"
                            >
                              <RotateCcw size={16} aria-hidden="true" />
                            </button>
                            <button
                              className={styles.actionBtnDanger}
                              disabled={deletingId === apt.id}
                              onClick={() => handleDelete(apt.id)}
                              title="Eliminar"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
