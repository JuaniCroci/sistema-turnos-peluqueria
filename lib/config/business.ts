import { parseTime } from '@/lib/utils/datetime';

export const BUSINESS_TZ = 'America/Argentina/Buenos_Aires';
export const SLOT_MINUTES = 40;
export const BUSINESS_NAME = 'The Bunker';
export const BUSINESS_PHONE = '3424 77-2489';
export const BUSINESS_INSTAGRAM = '@the.bunker1 · @tincholakd_';

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

export function getBlocksForDay(dayOfWeek: number): TimeBlock[] {
  if (dayOfWeek === 6) return TIME_BLOCKS_SAB;
  if (dayOfWeek === 0) return [];
  return TIME_BLOCKS_LUN_VIE;
}

export function isWithinBusinessHours(
  hour: number,
  minute: number,
  dayOfWeek?: number,
  blocks?: TimeBlock[],
): boolean {
  const effectiveBlocks =
    blocks ??
    (dayOfWeek !== undefined
      ? getBlocksForDay(dayOfWeek)
      : TIME_BLOCKS_LUN_VIE);
  const mins = hour * 60 + minute;
  for (const block of effectiveBlocks) {
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

export function isValidSlot(
  hour: number,
  minute: number,
  dayOfWeek?: number,
  blocks?: TimeBlock[],
): boolean {
  const effectiveBlocks =
    blocks ??
    (dayOfWeek !== undefined
      ? getBlocksForDay(dayOfWeek)
      : TIME_BLOCKS_LUN_VIE);
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return generateTimeSlots(effectiveBlocks).includes(timeStr);
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
