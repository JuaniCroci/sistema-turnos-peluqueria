export const BUSINESS_TZ = 'America/Argentina/Buenos_Aires';
export const SLOT_MINUTES = 40;

export interface TimeBlock {
  apertura: string;
  cierre: string;
}

export const TIME_BLOCKS_LUN_VIE: TimeBlock[] = [
  { apertura: '08:20', cierre: '13:00' },
  { apertura: '16:00', cierre: '20:00' },
];

export const TIME_BLOCKS_SAB: TimeBlock[] = [
  { apertura: '08:20', cierre: '13:00' },
  { apertura: '16:00', cierre: '20:00' },
];

function parseTime(t: string): { h: number; m: number } {
  const parts = t.split(':');
  return { h: Number(parts[0] ?? 0), m: Number(parts[1] ?? 0) };
}

export function isWithinBusinessHours(
  hour: number,
  minute: number,
  blocks?: TimeBlock[],
): boolean {
  const mins = hour * 60 + minute;
  for (const block of blocks ?? TIME_BLOCKS_LUN_VIE) {
    const { h: aH, m: aM } = parseTime(block.apertura);
    const { h: cH, m: cM } = parseTime(block.cierre);
    const open = aH * 60 + aM;
    const close = cH * 60 + cM;
    if (mins >= open && mins + SLOT_MINUTES <= close) {
      return true;
    }
  }
  return false;
}

export function generateTimeSlots(blocks?: TimeBlock[]): string[] {
  const slots: string[] = [];
  for (const block of blocks ?? TIME_BLOCKS_LUN_VIE) {
    const { h: aH, m: aM } = parseTime(block.apertura);
    const { h: cH, m: cM } = parseTime(block.cierre);
    const open = aH * 60 + aM;
    const close = cH * 60 + cM;
    for (let m = open; m + SLOT_MINUTES <= close; m += SLOT_MINUTES) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(
        `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      );
    }
  }
  return slots;
}
