export function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function formatSemana(mondayStr: string): string {
  const d = new Date(mondayStr + 'T00:00:00');
  const saturday = new Date(d);
  saturday.setDate(d.getDate() + 5);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const f = new Intl.DateTimeFormat('es-AR', opts);
  return `${f.format(d)} - ${f.format(saturday)}`;
}
