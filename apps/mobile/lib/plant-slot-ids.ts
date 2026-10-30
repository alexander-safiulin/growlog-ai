import { createGuestId } from '@growlog/domain';

const MAX_PLANT_LABELS = 200;

export function resizePlantSlotIds(count: number, prev: string[]): string[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  const n = Math.min(Math.max(0, Math.floor(count)), MAX_PLANT_LABELS);
  const next = prev.slice(0, n);
  while (next.length < n) next.push(createGuestId());
  return next;
}
