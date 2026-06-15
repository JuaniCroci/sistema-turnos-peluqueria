'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { formatPrice, formatDuration } from '@/lib/utils/format';
import type { Service, Category } from '@/lib/types';
import styles from './AdminServices.module.css';

interface FormData {
  category_id: string;
  name: string;
  description: string;
  duration_minutes: string;
  price_cents: string;
}

const emptyForm: FormData = {
  category_id: '',
  name: '',
  description: '',
  duration_minutes: '',
  price_cents: '',
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services?includeInactive=1&limit=100');
      if (!res.ok) throw new Error('Error al cargar servicios');
      const json = await res.json();
      setServices(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Error al cargar categorias');
      const json = await res.json();
      setCategories(json.data ?? []);
    } catch {
      // silencioso, las categorias no son criticas
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormError(null);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (service: Service) => {
    setForm({
      category_id: String(service.category_id),
      name: service.name,
      description: service.description ?? '',
      duration_minutes: String(service.duration_minutes),
      price_cents: String(service.price_cents / 100),
    });
    setEditingId(service.id);
    setShowForm(true);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const category_id = Number(form.category_id);
    const duration_minutes = Number(form.duration_minutes);
    const price_cents = Number(form.price_cents) * 100;

    if (!form.name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    if (!category_id) {
      setFormError('La categoria es requerida');
      return;
    }
    if (!duration_minutes || duration_minutes < 1) {
      setFormError('La duracion debe ser mayor a 0');
      return;
    }
    if (price_cents < 0) {
      setFormError('El precio no puede ser negativo');
      return;
    }

    setSaving(true);
    try {
      const body = {
        category_id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        duration_minutes,
        price_cents,
      };

      const url = editingId ? `/api/services/${editingId}` : '/api/services';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? 'Error al guardar');
      }

      resetForm();
      await fetchServices();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este servicio? (soft delete)')) return;
    setDeleteError(null);

    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json.error?.message ?? 'Error al eliminar');
        return;
      }
      await fetchServices();
    } catch {
      setDeleteError('Error al eliminar servicio');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Cargando servicios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Servicios</h1>
            <p className={styles.subtitle}>Gestion del catalogo de servicios</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            iconLeft={<Plus size={16} />}
          >
            Nuevo servicio
          </Button>
        </div>

        {showForm && (
          <Card padding="lg">
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label htmlFor="name">Nombre</label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={styles.input}
                    placeholder="Ej: Corte caballero"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="category">Categoria</label>
                  <select
                    id="category"
                    value={form.category_id}
                    onChange={(e) =>
                      setForm({ ...form, category_id: e.target.value })
                    }
                    className={styles.select}
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="duration">Duracion (minutos)</label>
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({ ...form, duration_minutes: e.target.value })
                    }
                    className={styles.input}
                    placeholder="Ej: 30"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="price">Precio ($)</label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price_cents}
                    onChange={(e) =>
                      setForm({ ...form, price_cents: e.target.value })
                    }
                    className={styles.input}
                    placeholder="Ej: 3000"
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label htmlFor="description">Descripcion (opcional)</label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className={styles.textarea}
                    rows={2}
                    placeholder="Descripcion del servicio..."
                  />
                </div>
              </div>

              {formError && (
                <div className={styles.formError}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {formError}
                </div>
              )}

              <div className={styles.formActions}>
                <Button type="submit" loading={saving}>
                  {editingId ? 'Guardar cambios' : 'Crear servicio'}
                </Button>
                <Button variant="ghost" onClick={resetForm} type="button">
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {deleteError && (
          <div className={styles.errorBox}>
            <AlertCircle size={16} aria-hidden="true" />
            {deleteError}
            <button
              className={styles.dismissBtn}
              onClick={() => setDeleteError(null)}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <Card padding="none">
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoria</th>
                  <th>Duracion</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th className={styles.actionsCol}></th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyRow}>
                      No hay servicios. Crea el primero.
                    </td>
                  </tr>
                ) : (
                  services.map((service) => {
                    const cat = categories.find(
                      (c) => c.id === service.category_id,
                    );
                    return (
                      <tr
                        key={service.id}
                        className={!service.active ? styles.inactive : ''}
                      >
                        <td className={styles.nameCell}>{service.name}</td>
                        <td className={styles.catCell}>{cat?.name ?? '-'}</td>
                        <td>
                          <span className={styles.metaChip}>
                            <Clock size={12} aria-hidden="true" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                        </td>
                        <td className={styles.priceCell}>
                          {formatPrice(service.price_cents)}
                        </td>
                        <td>
                          <Badge tone={service.active ? 'success' : 'neutral'}>
                            {service.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className={styles.actionsCol}>
                          <div className={styles.rowActions}>
                            <button
                              className={styles.iconBtn}
                              onClick={() => handleEdit(service)}
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            {service.active && (
                              <button
                                className={styles.iconBtnDanger}
                                onClick={() => handleDelete(service.id)}
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
