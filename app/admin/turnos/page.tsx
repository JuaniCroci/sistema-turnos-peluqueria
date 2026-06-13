'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Check, X, RotateCcw, Plus, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { formatLongDate, formatTime, formatPrice } from '@/lib/utils/format';
import type { AppointmentAdminRow } from '@/lib/db/appointments';
import type { AppointmentStatus } from '@/lib/types';
import styles from './AdminAppointments.module.css';

interface Service {
  id: number;
  category_id: number;
  name: string;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
}

interface FormState {
  client_name: string;
  service_id: string;
  date: string;
  time: string;
  notes: string;
  slotDate: string;
  slotTime: string;
}

const DAYS_TO_SHOW = 5;
const HOURS = Array.from({ length: 11 }, (_, i) => i + 9);

const TIME_SLOTS = Array.from({ length: 23 }, (_, i) => {
  const h = Math.floor((i * 30 + 540) / 60);
  const m = (i * 30 + 540) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const EMPTY_FORM: FormState = {
  client_name: '',
  service_id: '',
  date: '',
  time: '',
  notes: '',
  slotDate: '',
  slotTime: '',
};

const statusConfig: Record<string, { tone: 'warning' | 'success' | 'neutral' | 'danger' | 'info'; label: string }> = {
  pending: { tone: 'warning', label: 'Pendiente' },
  confirmed: { tone: 'success', label: 'Confirmado' },
  cancelled: { tone: 'neutral', label: 'Cancelado' },
  completed: { tone: 'info', label: 'Completado' },
};

const getStatusConfig = (status: string) => {
  return statusConfig[status] ?? { tone: 'neutral' as const, label: status };
};

function getDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDayLabel(dateStr: string): string {
  const todayStr = getDateString(new Date());
  if (dateStr === todayStr) return 'Hoy';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === getDateString(tomorrow)) return 'Mañana';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
}

function getDayShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
}

function getDateDays(days: number): string[] {
  const result: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    result.push(getDateString(d));
  }
  return result;
}

function parseHour(timeStr: string): number {
  return parseInt(timeStr.slice(0, 2), 10);
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentAdminRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<{ id: number; status: AppointmentStatus } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dates = getDateDays(DAYS_TO_SHOW);
  const fromDate = dates[0];
  const toDate = dates[dates.length - 1];

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: fromDate, to: `${toDate}T23:59:59`, limit: '100' } as Record<string, string>);
      const res = await fetch(`/api/appointments?${params}`);
      if (!res.ok) throw new Error('Error al cargar turnos');
      const json = await res.json();
      setAppointments(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services?limit=100');
      if (!res.ok) return;
      const json = await res.json();
      setServices((json.data ?? []).filter((s: Service) => s.active));
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchServices();
  }, [fetchAppointments, fetchServices]);

  const openForm = (date: string, time: string) => {
    setForm({
      client_name: '',
      service_id: '',
      date,
      time,
      notes: '',
      slotDate: date,
      slotTime: time,
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.service_id || !form.date || !form.time) {
      setFormError('Completá todos los campos requeridos');
      return;
    }

    const appointmentAt = `${form.date}T${form.time}:00`;

    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: Number(form.service_id),
          appointment_at: appointmentAt,
          client_name: form.client_name.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? 'Error al crear turno');
      }
      closeForm();
      await fetchAppointments();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

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

  const getAppointmentsForDay = (dateStr: string): AppointmentAdminRow[] => {
    return appointments
      .filter((a) => a.appointment_at.startsWith(dateStr))
      .sort((a, b) => a.appointment_at.localeCompare(b.appointment_at));
  };

  const isSlotOccupied = (dayApps: AppointmentAdminRow[], hour: number): boolean => {
    return dayApps.some((a) => {
      const aptHour = parseHour(a.appointment_at);
      const duration = a.service_duration_minutes;
      const endHour = aptHour + Math.ceil(duration / 60);
      return hour >= aptHour && hour < endHour;
    });
  };

  const getAppointmentForSlot = (dayApps: AppointmentAdminRow[], hour: number): AppointmentAdminRow | null => {
    return dayApps.find((a) => parseHour(a.appointment_at) === hour) ?? null;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Turnos agendados</h1>
            <p className={styles.subtitle}>Vista de los próximos 5 días</p>
          </div>
        </div>

        {actionError && (
          <div className={styles.errorBox} role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{actionError}</span>
            <button className={styles.dismissBtn} onClick={() => setActionError(null)} aria-label="Cerrar">
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <p className={styles.loading}>Cargando turnos...</p>
        ) : error ? (
          <div className={styles.errorBox} role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className={styles.dayGrid}>
              {dates.map((dateStr) => {
                const dayApps = getAppointmentsForDay(dateStr);
                return (
                  <div key={dateStr} className={styles.dayColumn}>
                    <div className={styles.dayHeader}>
                      <span className={styles.dayLabel}>{getDayLabel(dateStr)}</span>
                      <span className={styles.dayDate}>{getDayShort(dateStr)}</span>
                    </div>

                    <div className={styles.timeline}>
                      {HOURS.map((hour) => {
                        const timeStr = `${String(hour).padStart(2, '0')}:00`;
                        const occupied = isSlotOccupied(dayApps, hour);
                        const apt = getAppointmentForSlot(dayApps, hour);

                        if (occupied && apt) {
                          const duration = apt.service_duration_minutes;
                          const span = Math.max(1, Math.ceil(duration / 60));
                          const cfg = getStatusConfig(apt.status);
                          const isLoading = changingStatus?.id === apt.id;

                          return (
                            <div
                              key={`${dateStr}-${hour}`}
                              className={styles.appointmentSlot}
                              style={{ gridRow: `span ${span}` }}
                            >
                              <div className={styles.apptTime}>
                                {timeStr}
                              </div>
                              <div className={styles.apptCard}>
                                <div className={styles.apptHeader}>
                                  <span className={styles.apptService}>{apt.service_name}</span>
                                  <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                </div>
                                <div className={styles.apptClient}>
                                  {apt.client_name ?? apt.user_username ?? apt.user_email ?? 'Cliente sin cuenta'}
                                </div>
                                <div className={styles.apptMeta}>
                                  <span>{formatTime(apt.appointment_at)}</span>
                                  <span>{formatPrice(apt.service_price_cents)}</span>
                                </div>
                                <div className={styles.apptActions}>
                                  {apt.status === 'pending' && (
                                    <>
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
                                    </>
                                  )}
                                  {apt.status === 'confirmed' && (
                                    <>
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
                                    </>
                                  )}
                                  {apt.status === 'cancelled' && (
                                    <button
                                      className={styles.actionBtn}
                                      disabled={!!isLoading}
                                      onClick={() => handleStatusChange(apt.id, 'pending')}
                                      title="Reabrir"
                                    >
                                      <RotateCcw size={12} aria-hidden="true" />
                                      Reabrir
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={`${dateStr}-${hour}`}
                            className={styles.emptySlot}
                            onClick={() => openForm(dateStr, timeStr)}
                            aria-label={`Agregar turno a las ${timeStr}`}
                          >
                            <span className={styles.emptyTime}>{timeStr}</span>
                            <span className={styles.emptyPlus}>
                              <Plus size={14} aria-hidden="true" />
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      className={styles.addDayButton}
                      onClick={() => openForm(dateStr, '09:00')}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Agregar turno
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Agregar turno">
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Agregar turno</h2>
              <button className={styles.modalClose} onClick={closeForm} aria-label="Cerrar">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.field}>
                <label htmlFor="form-date">Fecha</label>
                <input
                  id="form-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="form-time">Horario</label>
                <select
                  id="form-time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Seleccionar horario...</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="form-service">Servicio</label>
                <select
                  id="form-service"
                  value={form.service_id}
                  onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Seleccionar servicio...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatPrice(s.price_cents)} · {s.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="form-client">Nombre del cliente</label>
                <input
                  id="form-client"
                  type="text"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className={styles.input}
                  placeholder="Ej: Juan Pérez"
                />
                <span className={styles.fieldHint}>
                  Si el cliente no tiene cuenta en la app, ingresá su nombre acá
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="form-notes">Nota (opcional)</label>
                <textarea
                  id="form-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={styles.textarea}
                  rows={2}
                  placeholder="Alguna observación..."
                />
              </div>

              {formError && (
                <div className={styles.formError} role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <Button type="submit" loading={saving}>
                  Guardar turno
                </Button>
                <Button variant="ghost" onClick={closeForm} type="button">
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
