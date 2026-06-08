'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Check, X, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { formatLongDate, formatTime, formatPrice } from '@/lib/utils/format';
import type { AppointmentAdminRow } from '@/lib/db/appointments';
import type { AppointmentStatus } from '@/lib/types';
import styles from './AdminAppointments.module.css';

interface UserOption {
  id: number;
  email: string;
  username: string;
}

const statusConfig: Record<string, { tone: 'warning' | 'success' | 'neutral' | 'danger' | 'info'; label: string }> = {
  pending: { tone: 'warning', label: 'Pendiente' },
  confirmed: { tone: 'success', label: 'Confirmado' },
  cancelled: { tone: 'neutral', label: 'Cancelado' },
  completed: { tone: 'info', label: 'Completado' },
};

const getStatusConfig = (status: string) => {
  return statusConfig[status] ?? { tone: 'neutral' as const, label: status };
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentAdminRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [changingStatus, setChangingStatus] = useState<{ id: number; status: AppointmentStatus } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '30');
      if (filterStatus) params.set('status', filterStatus);
      if (filterUserId) params.set('user_id', filterUserId);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);

      const res = await fetch(`/api/appointments?${params}`);
      if (!res.ok) throw new Error('Error al cargar turnos');
      const json = await res.json();
      setAppointments(json.data ?? []);
      setTotalPages(Math.max(1, Math.ceil((json.pagination?.total ?? 0) / (json.pagination?.limit ?? 30))));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterUserId, filterFrom, filterTo]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return;
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchAppointments(page);
  }, [fetchAppointments, page]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterUserId, filterFrom, filterTo]);

  const handleStatusChange = async (id: number, status: AppointmentStatus) => {
    setChangingStatus({ id, status });
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
      await fetchAppointments(page);
    } catch {
      setActionError('Error al actualizar turno');
    } finally {
      setChangingStatus(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Turnos</h1>
            <p className={styles.subtitle}>Gestion de todas las reservas</p>
          </div>
        </div>

        <Card padding="md">
          <div className={styles.filters}>
            <div className={styles.filterField}>
              <label htmlFor="filter-status">Estado</label>
              <select id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="cancelled">Cancelado</option>
                <option value="completed">Completado</option>
              </select>
            </div>

            <div className={styles.filterField}>
              <label htmlFor="filter-user">Cliente</label>
              <select id="filter-user" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} className={styles.filterSelect}>
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterField}>
              <label htmlFor="filter-from">Desde</label>
              <input id="filter-from" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={styles.filterInput} />
            </div>

            <div className={styles.filterField}>
              <label htmlFor="filter-to">Hasta</label>
              <input id="filter-to" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={styles.filterInput} />
            </div>

            {(filterStatus || filterUserId || filterFrom || filterTo) && (
              <Button size="sm" variant="ghost" onClick={() => { setFilterStatus(''); setFilterUserId(''); setFilterFrom(''); setFilterTo(''); }}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </Card>

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
        ) : (
          <>
            <Card padding="none">
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Horario</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th className={styles.actionsCol}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={styles.emptyRow}>
                          No se encontraron turnos.
                        </td>
                      </tr>
                    ) : appointments.map((apt) => {
                      const cfg = getStatusConfig(apt.status);
                      const isLoading = changingStatus?.id === apt.id;

                      return (
                        <tr key={apt.id}>
                          <td className={styles.serviceCell}>{apt.service_name}</td>
                          <td className={styles.userCell}>{apt.user_email}</td>
                          <td className={styles.dateCell}>{formatLongDate(apt.appointment_at)}</td>
                          <td className={styles.dateCell}>{formatTime(apt.appointment_at)}</td>
                          <td className={styles.dateCell}>{formatPrice(apt.service_price_cents)}</td>
                          <td>
                            <Badge tone={cfg.tone}>{cfg.label}</Badge>
                          </td>
                          <td className={styles.actionsCol}>
                            {apt.status === 'pending' && (
                              <div className={styles.rowActions}>
                                <button
                                  className={styles.actionBtnSuccess}
                                  disabled={!!isLoading}
                                  onClick={() => handleStatusChange(apt.id, 'confirmed')}
                                  title="Confirmar"
                                >
                                  <Check size={12} aria-hidden="true" />
                                  Confirmar
                                </button>
                                <button
                                  className={styles.actionBtnDanger}
                                  disabled={!!isLoading}
                                  onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                  title="Cancelar"
                                >
                                  <X size={12} aria-hidden="true" />
                                  Cancelar
                                </button>
                              </div>
                            )}
                            {apt.status === 'confirmed' && (
                              <div className={styles.rowActions}>
                                <button
                                  className={styles.actionBtnSuccess}
                                  disabled={!!isLoading}
                                  onClick={() => handleStatusChange(apt.id, 'completed')}
                                  title="Completar"
                                >
                                  <Check size={12} aria-hidden="true" />
                                  Completar
                                </button>
                                <button
                                  className={styles.actionBtnDanger}
                                  disabled={!!isLoading}
                                  onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                  title="Cancelar"
                                >
                                  <X size={12} aria-hidden="true" />
                                  Cancelar
                                </button>
                              </div>
                            )}
                            {apt.status === 'cancelled' && (
                              <div className={styles.rowActions}>
                                <button
                                  className={styles.actionBtn}
                                  disabled={!!isLoading}
                                  onClick={() => handleStatusChange(apt.id, 'pending')}
                                  title="Reabrir"
                                >
                                  <RotateCcw size={12} aria-hidden="true" />
                                  Reabrir
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

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
