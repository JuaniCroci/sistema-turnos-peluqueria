'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/Button/Button';
import { formatDuration, formatPrice } from '@/lib/utils/format';
import type { Service } from '@/lib/types';
import styles from './NewAdminAppointment.module.css';

const TIME_SLOTS = Array.from({ length: 23 }, (_, i) => {
  const h = Math.floor((i * 30 + 540) / 60);
  const m = (i * 30 + 540) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export default function NewAdminAppointmentPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const todayStr = useMemo(() => getTodayStr(), []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services?limit=100');
        if (!res.ok) throw new Error('Error al cargar servicios');
        const json = await res.json();
        setServices(json.data ?? []);
      } catch {
        setError('Error al cargar servicios');
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const fetchOccupiedSlots = useCallback(async (dateStr: string) => {
    setLoadingSlots(true);
    setTime('');
    try {
      const res = await fetch(`/api/appointments/slots?date=${dateStr}`);
      if (!res.ok) throw new Error('Error al consultar horarios');
      const json = await res.json();
      setOccupiedSlots(json.slots ?? []);
    } catch {
      setOccupiedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setTime('');
    if (newDate) {
      void fetchOccupiedSlots(newDate);
    } else {
      setOccupiedSlots([]);
    }
  };

  const slotStates = useMemo(() => {
    const isToday = date === todayStr;
    const currentMinutes = getCurrentTimeMinutes();

    return TIME_SLOTS.map((slot) => {
      const isOccupied = occupiedSlots.includes(slot);
      const isPast =
        isToday &&
        (() => {
          const [hStr, mStr] = slot.split(':');
          const slotMinutes = Number(hStr) * 60 + Number(mStr);
          return slotMinutes <= currentMinutes;
        })();

      return {
        value: slot,
        disabled: isOccupied || isPast,
        isOccupied,
      };
    });
  }, [date, todayStr, occupiedSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serviceId) {
      setError('Selecciona un servicio');
      return;
    }
    if (!date) {
      setError('Selecciona una fecha');
      return;
    }
    if (!time) {
      setError('Selecciona un horario');
      return;
    }
    if (!clientName.trim()) {
      setError('Ingresa el nombre del cliente');
      return;
    }

    const appointmentAt = new Date(`${date}T${time}:00`).toISOString();

    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: Number(serviceId),
          appointment_at: appointmentAt,
          client_name: clientName.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? 'Error al crear turno');
      }

      router.push('/admin/turnos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const selectedService = services.find((s) => String(s.id) === serviceId);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Agendar turno</h1>
          <p className={styles.subtitle}>
            Registrá un turno manual para un cliente sin cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="date">Fecha</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              min={todayStr}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="time">Horario</label>
            {loadingSlots ? (
              <p className={styles.fieldHint}>
                Consultando horarios disponibles...
              </p>
            ) : (
              <select
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={styles.select}
                disabled={!date}
              >
                <option value="">
                  {date
                    ? 'Seleccionar horario...'
                    : 'Primero seleccioná una fecha'}
                </option>
                {!slotStates.some((s) => !s.disabled) && date && (
                  <option value="" disabled>
                    No hay horarios disponibles para esta fecha
                  </option>
                )}
                {slotStates.map((s) => (
                  <option key={s.value} value={s.value} disabled={s.disabled}>
                    {s.value} hs{s.isOccupied ? ' (ocupado)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="service">Servicio</label>
            {loadingServices ? (
              <p className={styles.fieldHint}>Cargando servicios...</p>
            ) : (
              <select
                id="service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className={styles.select}
              >
                <option value="">Seleccionar servicio...</option>
                {services
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {formatPrice(s.price_cents)} (
                      {formatDuration(s.duration_minutes)})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {selectedService && (
            <div className={styles.serviceDetail}>
              <Clock
                size={16}
                className={styles.serviceDetailIcon}
                aria-hidden="true"
              />
              <span>{formatDuration(selectedService.duration_minutes)}</span>
              <span className={styles.serviceDetailPrice}>
                {formatPrice(selectedService.price_cents)}
              </span>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="client">Nombre del cliente</label>
            <input
              id="client"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={styles.input}
              placeholder="Ej: Juan Pérez"
            />
            <span className={styles.fieldHint}>
              Cliente que reservó por WhatsApp, teléfono o presencial
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="notes">Notas (opcional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
              rows={3}
              placeholder="Alguna observación..."
            />
          </div>

          {error && (
            <div className={styles.formError}>
              <AlertCircle size={14} aria-hidden="true" />
              {error}
            </div>
          )}

          <div className={styles.formActions}>
            <Button
              type="submit"
              loading={saving}
              iconLeft={<Calendar size={16} />}
            >
              Guardar turno
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push('/admin/turnos')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
