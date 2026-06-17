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
import { TIME_BLOCKS_LUN_VIE, TIME_BLOCKS_SAB } from '@/lib/config/business';
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

function getMondayISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function formatSemana(mondayStr: string): string {
  const d = new Date(mondayStr + 'T00:00:00');
  const saturday = new Date(d);
  saturday.setDate(d.getDate() + 5);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const f = new Intl.DateTimeFormat('es-AR', opts);
  return `${f.format(d)} - ${f.format(saturday)}`;
}

export const ExportClient = () => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<DisponibilidadResult | null>(null);
  const [monday, setMonday] = useState(getMondayISO);
  const [slotStates, setSlotStates] = useState<Record<string, DaySlots>>({});
  const [bgUrl, setBgUrl] = useState('');
  const [lunVieApertura, setLunVieApertura] = useState(
    TIME_BLOCKS_LUN_VIE[0]?.apertura ?? '08:20',
  );
  const [lunVieCierre, setLunVieCierre] = useState(
    TIME_BLOCKS_LUN_VIE[TIME_BLOCKS_LUN_VIE.length - 1]?.cierre ?? '20:00',
  );
  const [sabApertura, setSabApertura] = useState(
    TIME_BLOCKS_SAB[0]?.apertura ?? '08:20',
  );
  const [sabCierre, setSabCierre] = useState(
    TIME_BLOCKS_SAB[TIME_BLOCKS_SAB.length - 1]?.cierre ?? '20:00',
  );

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ desde: monday });
        if (lunVieApertura && lunVieCierre) {
          params.set('lunVieApertura', lunVieApertura);
          params.set('lunVieCierre', lunVieCierre);
        }
        if (sabApertura && sabCierre) {
          params.set('sabApertura', sabApertura);
          params.set('sabCierre', sabCierre);
        }
        const res = await fetch(`/api/export/disponibilidad?${params}`);
        if (!res.ok) throw new Error('Error al cargar disponibilidad');
        const json: DisponibilidadResult = await res.json();
        if (ignore) return;
        setData(json);

        const newSlotStates: Record<string, DaySlots> = {};
        for (const dia of json.dias) {
          const day: DaySlots = {};
          for (const slot of dia.libres) {
            day[slot] = 'libre';
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
  }, [monday, lunVieApertura, lunVieCierre, sabApertura, sabCierre]);

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

  const getSlotLabel = (state: SlotState): string => {
    switch (state) {
      case 'ocupado':
        return 'OCUPADO';
      case 'semanal':
        return 'SEMANAL';
      default:
        return '';
    }
  };

  const download = async () => {
    if (!previewRef.current) return;
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `turnos-disponibles-${monday}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError('Error al generar la imagen');
    }
  };

  const prevWeek = () => setMonday((p) => addWeeks(p, -1));
  const nextWeek = () => setMonday((p) => addWeeks(p, +1));

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
              <ChevronLeft size={20} />
            </button>
            <span className={styles.weekLabel}>
              {data ? formatSemana(data.semana) : 'Cargando...'}
            </span>
            <button
              onClick={nextWeek}
              className={styles.navBtn}
              aria-label="Semana siguiente"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className={styles.controlsGrid}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Lun-Vie apertura</label>
            <input
              type="time"
              value={lunVieApertura}
              onChange={(e) => setLunVieApertura(e.target.value)}
              className={styles.timeInput}
            />
            <label className={styles.controlLabel}>Lun-Vie cierre</label>
            <input
              type="time"
              value={lunVieCierre}
              onChange={(e) => setLunVieCierre(e.target.value)}
              className={styles.timeInput}
            />
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Sábado apertura</label>
            <input
              type="time"
              value={sabApertura}
              onChange={(e) => setSabApertura(e.target.value)}
              className={styles.timeInput}
            />
            <label className={styles.controlLabel}>Sábado cierre</label>
            <input
              type="time"
              value={sabCierre}
              onChange={(e) => setSabCierre(e.target.value)}
              className={styles.timeInput}
            />
          </div>

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
                <div className={styles.previewBrand}>THE BUNKER</div>
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

                  const slotChunks: string[] = [];
                  let currentLabel = '';
                  let currentSlots: string[] = [];

                  for (const slot of libreKeys) {
                    const state = daySlots[slot] ?? 'libre';
                    const label = getSlotLabel(state);
                    if (label !== currentLabel) {
                      if (currentSlots.length > 0) {
                        slotChunks.push(
                          `${currentLabel} ${currentSlots.join('-')}`.trim(),
                        );
                      }
                      currentLabel = label;
                      currentSlots = [slot];
                    } else {
                      currentSlots.push(slot);
                    }
                  }
                  if (currentSlots.length > 0) {
                    slotChunks.push(
                      `${currentLabel} ${currentSlots.join('-')}`.trim(),
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
                <span>WhatsApp: 3424 77-2489</span>
                <span>@the.bunker1 · @tincholakd_</span>
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
          </div>
        </div>
      ) : null}
    </div>
  );
};
