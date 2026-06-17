import { BUSINESS_TZ } from '@/lib/config/business';

export function parseTime(t: string): { h: number; m: number } {
  const parts = t.split(':');
  return { h: Number(parts[0] ?? 0), m: Number(parts[1] ?? 0) };
}

export function getMonday(desde: string): string {
  const d = new Date(desde + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function getLocalDateParts(isoUtc: string): {
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  const date = new Date(isoUtc);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const dayName = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { hour, minute, dayOfWeek: dayMap[dayName] ?? 0 };
}

export function utcRangeForLocalDate(date: string): {
  fromIso: string;
  toIso: string;
} {
  const parts = date.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  const probeUtc = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const probeParts = formatter.formatToParts(probeUtc);
  const probeHour = Number(
    probeParts.find((p) => p.type === 'hour')?.value ?? 12,
  );
  const probeMin = Number(
    probeParts.find((p) => p.type === 'minute')?.value ?? 0,
  );

  const offsetMs = (12 * 60 - probeHour * 60 - probeMin) * 60 * 1000;

  const fromUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + offsetMs);
  const toUtc = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) + offsetMs);

  return {
    fromIso: fromUtc.toISOString(),
    toIso: toUtc.toISOString(),
  };
}
