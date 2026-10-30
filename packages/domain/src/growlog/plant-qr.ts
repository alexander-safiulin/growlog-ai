/** Stable deep-link payload for printed plant labels (scanned in Growlog mobile). */

export const PLANT_QR_VERSION = 1 as const;

export function buildPlantQrUrl(params: { farmId: string; plantId: string }): string {
  const query = new URLSearchParams({
    v: String(PLANT_QR_VERSION),
    f: params.farmId,
    p: params.plantId,
  });
  return `growlog://plant?${query.toString()}`;
}

export function parsePlantQrUrl(raw: string): { farmId: string; plantId: string } | null {
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.includes('plant')) return null;

  const queryStart = trimmed.indexOf('?');
  if (queryStart === -1) return null;

  const params = new URLSearchParams(trimmed.slice(queryStart + 1));
  const version = Number(params.get('v') ?? PLANT_QR_VERSION);
  if (version !== PLANT_QR_VERSION) return null;

  const farmId = params.get('f')?.trim() ?? '';
  const plantId = params.get('p')?.trim() ?? '';
  if (!farmId || !plantId) return null;
  return { farmId, plantId };
}
