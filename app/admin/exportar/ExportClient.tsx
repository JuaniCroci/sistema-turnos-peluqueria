'use client';

import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import type { DisponibilidadResult } from '@/lib/db/appointments';
import {
  TIME_BLOCKS_LUN_VIE,
  TIME_BLOCKS_SAB,
  type TimeBlock,
} from '@/lib/config/business';
import { addWeeks, formatSemana } from '@/lib/utils/datetime.client';
import styles from './ExportClient.module.css';

type SlotState = 'libre' | 'ocupado' | 'semanal';
type DaySlots = Record<string, SlotState>;

const DIAS_LABEL: Record<string, string> = {
  lunes: 'LUNES',
  martes: 'MARTES',
  miercoles: 'MIERCOLES',
  jueves: 'JUEVES',
  viernes: 'VIERNES',
  sabado: 'SABADO',
};

function mondayToday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(now);
  m.setDate(now.getDate() + diff);
  return m.toISOString().slice(0, 10);
}

interface BlockEditorProps {
  label: string;
  blocks: TimeBlock[];
  onChange: (blocks: TimeBlock[]) => void;
}

function BlockEditor({ label, blocks, onChange }: BlockEditorProps) {
  const updateBlock = (
    i: number,
    field: 'apertura' | 'cierre',
    val: string,
  ) => {
    const next = blocks.map((b, idx) =>
      idx === i ? { ...b, [field]: val } : b,
    );
    onChange(next);
  };

  return (
    <div className={styles.controlGroup}>
      <label className={styles.controlLabel}>{label}</label>
      {blocks.map((b, i) => (
        <div key={i} className={styles.blockRow}>
          <input
            type="time"
            value={b.apertura}
            onChange={(e) => updateBlock(i, 'apertura', e.target.value)}
            className={styles.timeInput}
          />
          <span className={styles.blockSep}>a</span>
          <input
            type="time"
            value={b.cierre}
            onChange={(e) => updateBlock(i, 'cierre', e.target.value)}
            className={styles.timeInput}
          />
        </div>
      ))}
    </div>
  );
}

export const ExportClient = () => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<DisponibilidadResult | null>(null);
  const [monday, setMonday] = useState(mondayToday);
  const [slotStates, setSlotStates] = useState<Record<string, DaySlots>>({});
  const [bgUrl, setBgUrl] = useState('');
  const [lunVieBlocks, setLunVieBlocks] =
    useState<TimeBlock[]>(TIME_BLOCKS_LUN_VIE);
  const [sabBlocks, setSabBlocks] = useState<TimeBlock[]>(TIME_BLOCKS_SAB);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ desde: monday });
        params.set('lunVie', JSON.stringify(lunVieBlocks));
        params.set('sab', JSON.stringify(sabBlocks));

        const res = await fetch(`/api/export/disponibilidad?${params}`);
        if (!res.ok) throw new Error('Error al cargar disponibilidad');
        const json: DisponibilidadResult & {
          negocio: { nombre: string; telefono: string; instagram: string };
        } = await res.json();
        if (ignore) return;
        setData(json);

        const newSlotStates: Record<string, DaySlots> = {};
        for (const dia of json.dias) {
          const day: DaySlots = {};
          for (const slot of dia.libres) {
            day[slot] = 'libre';
          }
          for (const slot of dia.ocupados) {
            day[slot] = 'ocupado';
          }
          newSlotStates[dia.fecha] = day;
        }
        setSlotStates(newSlotStates);
      } catch (e) {
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [monday, lunVieBlocks, sabBlocks]);

  const cycleSlot = (fecha: string, slot: string) => {
    setSlotStates((prev) => {
      const day = { ...(prev[fecha] ?? {}) };
      const current = day[slot] ?? 'libre';
      const next: SlotState =
        current === 'libre'
          ? 'ocupado'
          : current === 'ocupado'
            ? 'semanal'
            : 'libre';
      day[slot] = next;
      return { ...prev, [fecha]: day };
    });
  };

  const getSlotStyle = (state: SlotState): string => {
    switch (state) {
      case 'ocupado':
        return styles.slotOcupado ?? '';
      case 'semanal':
        return styles.slotSemanal ?? '';
      default:
        return styles.slotLibre ?? '';
    }
  };

  const download = async () => {
    if (!previewRef.current) return;
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `turnos-disponibles-${monday}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'SecurityError') {
        setError(
          'La imagen de fondo no se pudo incluir por restricciones del servidor de origen. Probá con otra imagen o sin fondo personalizado.',
        );
      } else {
        setError('Error al generar la imagen');
      }
    }
  };

  const prevWeek = () => setMonday((p) => addWeeks(p, -1));
  const nextWeek = () => setMonday((p) => addWeeks(p, +1));

  const negocio = data?.negocio ?? {
    nombre: 'THE BUNKER',
    telefono: '3424 77-2489',
    instagram: '@the.bunker1 · @tincholakd_',
  };

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <div className={styles.controlsRow}>
          <div className={styles.weekNav}>
            <button
              onClick={prevWeek}
              className={styles.navBtn}
              aria-label="Semana anterior"
            >
              <ChevronLeft size={24} />
            </button>
            <span className={styles.weekLabel}>
              {data ? formatSemana(data.semana) : 'Cargando...'}
            </span>
            <button
              onClick={nextWeek}
              className={styles.navBtn}
              aria-label="Semana siguiente"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className={styles.controlsGrid}>
          <BlockEditor
            label="Lun-Vie"
            blocks={lunVieBlocks}
            onChange={setLunVieBlocks}
          />
          <BlockEditor
            label="Sábado"
            blocks={sabBlocks}
            onChange={setSabBlocks}
          />
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>URL de fondo</label>
            <div className={styles.bgInputWrapper}>
              <ImageIcon size={16} className={styles.bgInputIcon} />
              <input
                type="url"
                value={bgUrl}
                onChange={(e) => setBgUrl(e.target.value)}
                placeholder="https://ejemplo.com/foto.jpg"
                className={styles.bgInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={[styles.legendDot, styles.legendLibre].join(' ')}
            />
            Libre
          </span>
          <span className={styles.legendItem}>
            <span
              className={[styles.legendDot, styles.legendOcupado].join(' ')}
            />
            Ocupado
          </span>
          <span className={styles.legendItem}>
            <span
              className={[styles.legendDot, styles.legendSemanal].join(' ')}
            />
            Semanal
          </span>
          <span className={styles.legendHint}>Click para cambiar estado</span>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Cargando disponibilidad...</p>
        </div>
      ) : data ? (
        <div className={styles.previewWrapper}>
          <div
            ref={previewRef}
            className={styles.preview}
            style={{
              backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
            }}
          >
            <div className={styles.previewOverlay} />

            <div className={styles.previewContent}>
              <div className={styles.previewHeader}>
                <div className={styles.previewBrand}>{negocio.nombre}</div>
                <div className={styles.previewSubtitle}>Turnos disponibles</div>
              </div>

              <div className={styles.previewDays}>
                {data.dias.map((dia) => {
                  const daySlots = slotStates[dia.fecha] ?? {};
                  const libreKeys = Object.keys(daySlots);

                  if (libreKeys.length === 0) {
                    return (
                      <div key={dia.fecha} className={styles.previewDay}>
                        <div className={styles.previewDayName}>
                          {DIAS_LABEL[dia.nombre] ?? dia.nombre}
                        </div>
                        <div className={styles.previewDaySlots}>
                          <span className={styles.noSlots}>Sin atencion</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={dia.fecha} className={styles.previewDay}>
                      <div className={styles.previewDayName}>
                        {DIAS_LABEL[dia.nombre] ?? dia.nombre}
                      </div>
                      <div className={styles.previewDaySlots}>
                        {libreKeys.map((slot) => {
                          const state = daySlots[slot] ?? 'libre';
                          return (
                            <button
                              key={slot}
                              className={[
                                styles.slotBtn,
                                getSlotStyle(state),
                              ].join(' ')}
                              onClick={() => cycleSlot(dia.fecha, slot)}
                              title={`${slot} — Click para cambiar estado`}
                            >
                              {slot}
                              {state === 'ocupado' && (
                                <span className={styles.slotLabelOcupado}>
                                  OCUPADO
                                </span>
                              )}
                              {state === 'semanal' && (
                                <span className={styles.slotLabelSemanal}>
                                  SEMANAL
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.previewFooter}>
                <span>WhatsApp: {negocio.telefono}</span>
                <span>{negocio.instagram}</span>
              </div>
            </div>
          </div>

          <div className={styles.downloadArea}>
            <button onClick={download} className={styles.downloadBtn}>
              <Download size={20} />
              Descargar PNG
            </button>
            <p className={styles.downloadHint}>
              La imagen se descarga en 1080×1920 px, optimizada para Stories.
              Los estados (OCUPADO/SEMANAL) los editás vos desde la preview.
            </p>

            {data.reservados.length > 0 && (
              <details className={styles.reservadosDetails}>
                <summary className={styles.reservadosSummary}>
                  Turnos reservados esta semana ({data.reservados.length})
                </summary>
                <div className={styles.reservadosList}>
                  {data.reservados.map((r, i) => {
                    const d = new Date(r.appointment_at);
                    const fecha = d.toLocaleDateString('es-AR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                    });
                    const hora = d.toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    });
                    return (
                      <div key={i} className={styles.reservadoRow}>
                        <span className={styles.reservadoFecha}>{fecha}</span>
                        <span className={styles.reservadoHora}>{hora}</span>
                        <span className={styles.reservadoCliente}>
                          {r.client_name ?? 'Anonimo'}
                        </span>
                        <span className={styles.reservadoServicio}>
                          {r.service_name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
