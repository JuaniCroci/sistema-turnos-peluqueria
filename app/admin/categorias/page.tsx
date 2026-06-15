'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import type { Category } from '@/lib/types';
import styles from './AdminCategories.module.css';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Error al cargar categorias');
      const json = await res.json();
      setCategories(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setFormError(null);
    setShowForm(false);
  };

  const handleSlugChange = (value: string) => {
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    if (!slug.trim()) {
      setFormError('El slug es requerido');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? 'Error al crear');
      }
      resetForm();
      await fetchCategories();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar esta categoria?')) return;
    setDeleteError(null);

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json.error?.message ?? 'Error al eliminar');
        return;
      }
      await fetchCategories();
    } catch {
      setDeleteError('Error al eliminar categoria');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Cargando categorias...</p>
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
            <h1 className={styles.title}>Categorias</h1>
            <p className={styles.subtitle}>
              Gestion de categorias de servicios
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            iconLeft={<Plus size={16} />}
          >
            Nueva categoria
          </Button>
        </div>

        {showForm && (
          <Card padding="lg">
            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label htmlFor="cat-name">Nombre</label>
                  <input
                    id="cat-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                    className={styles.input}
                    placeholder="Ej: Cabello"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="cat-slug">Slug</label>
                  <input
                    id="cat-slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={styles.input}
                    placeholder="Ej: cabello"
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label htmlFor="cat-desc">Descripcion (opcional)</label>
                  <textarea
                    id="cat-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.textarea}
                    rows={2}
                    placeholder="Descripcion de la categoria..."
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
                  Crear categoria
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
                  <th>Slug</th>
                  <th>Descripcion</th>
                  <th className={styles.actionsCol}></th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyRow}>
                      No hay categorias. Crea la primera.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className={styles.nameCell}>{cat.name}</td>
                      <td className={styles.slugCell}>{cat.slug}</td>
                      <td className={styles.descCell}>
                        {cat.description ?? '-'}
                      </td>
                      <td className={styles.actionsCol}>
                        <button
                          className={styles.iconBtnDanger}
                          onClick={() => handleDelete(cat.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
