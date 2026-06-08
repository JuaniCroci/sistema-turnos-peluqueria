'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, CheckCircle, AlertCircle, Scissors } from 'lucide-react';
import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { Spinner } from '@/components/Spinner/Spinner';
import { formatDuration, formatPrice } from '@/lib/utils/format';
import type { Service } from '@/lib/types';
import styles from './NewAppointment.module.css';

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get('servicio');

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceId, setServiceId] = useState(preselectedServiceId || '');
  const [appointmentAt, setAppointmentAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const selectedService = services.find((s) => String(s.id) === serviceId);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serviceId) {
      setError('Selecciona un servicio');
      return;
    }
    if (!appointmentAt) {
      setError('Selecciona fecha y hora');
      return;
    }
    if (new Date(appointmentAt) <= new Date()) {
      setError('La fecha debe ser futura');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: Number(serviceId),
          appointment_at: appointmentAt,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? 'Error al reservar turno');
      }

      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Card padding="lg">
            <div className={styles.successBox}>
              <CheckCircle size={48} color="var(--color-success)" aria-hidden="true" />
              <p className={styles.successTitle}>Turno reservado</p>
              <p className={styles.successDesc}>
                Tu turno fue registrado. Podes verlo y gestionarlo desde &quot;Mis turnos&quot;.
              </p>
              <div className={styles.successActions}>
                <Button onClick={() => router.push('/mis-turnos')}>
                  Ver mis turnos
                </Button>
                <Button variant="ghost" onClick={() => { setSuccess(false); setServiceId(''); setAppointmentAt(''); setNotes(''); }}>
                  Reservar otro
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reservar turno</h1>
          <p className={styles.subtitle}>Elegi servicio, fecha y hora</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className={styles.form}>
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
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {formatPrice(s.price_cents)} ({formatDuration(s.duration_minutes)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedService && (
              <div className={styles.serviceDetail}>
                <Scissors size={20} className={styles.serviceDetailIcon} aria-hidden="true" />
                <div className={styles.serviceDetailInfo}>
                  <span className={styles.serviceDetailName}>{selectedService.name}</span>
                  <span className={styles.serviceDetailMeta}>
                    {formatDuration(selectedService.duration_minutes)} &middot; {formatPrice(selectedService.price_cents)}
                  </span>
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="datetime">Fecha y hora</label>
              <input
                id="datetime"
                type="datetime-local"
                value={appointmentAt}
                onChange={(e) => setAppointmentAt(e.target.value)}
                min={minDateStr}
                className={styles.input}
              />
              <span className={styles.fieldHint}>
                Elegi una fecha y hora disponible. No puede haber otro turno en el mismo horario.
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
                placeholder="Alguna nota para el peluquero..."
              />
            </div>

            {error && (
              <div className={styles.formError}>
                <AlertCircle size={14} aria-hidden="true" />
                {error}
              </div>
            )}

            <div className={styles.formActions}>
              <Button type="submit" loading={saving} iconLeft={<Calendar size={16} />}>
                Reservar turno
              </Button>
              <Button variant="ghost" type="button" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Reservar turno</h1>
            <p className={styles.subtitle}>Cargando...</p>
          </div>
          <Spinner />
        </div>
      </div>
    }>
      <NewAppointmentForm />
    </Suspense>
  );
}
