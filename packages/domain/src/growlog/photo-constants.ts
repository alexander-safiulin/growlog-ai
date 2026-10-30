/**
 * ADR-010: единая версия анализа и лимиты для vision-воркера / retrieval.
 * Меняя версию, добавьте миграцию или backfill под новую схему сигналов.
 */
export const DEFAULT_PHOTO_ANALYSIS_VERSION = 'v1';

/** Дефолтный лимит (20 MiB); совпадает с сервером, если env не заданы. */
export const DEFAULT_MAX_PHOTO_BYTES_VISION = 20 * 1024 * 1024;

/**
 * Кадр, который реально кладём в Storage (ADR-010 capture).
 * Длинная сторона 2048 px: лист, сетка и пятна читаются при увеличении,
 * а vision всё равно смотрит меньший кадр. Пропорции сохраняем, кадр не обрезаем.
 */
export const STORED_PHOTO_MAX_EDGE_PX = 2048;

/** JPEG для сохранённого кадра. 1 — без сжатия. */
export const STORED_PHOTO_JPEG_QUALITY = 0.82;

/**
 * Уже нормализованный JPEG меньше этого размера повторно не пережимаем,
 * чтобы не копить артефакты при повторном сохранении.
 */
export const STORED_PHOTO_SKIP_REENCODE_BYTES = 2 * 1024 * 1024;

export function storedPhotoResize(
  width: number,
  height: number,
): { width: number } | { height: number } | null {
  const longEdge = Math.max(width, height);
  if (width <= 0 || height <= 0 || longEdge <= STORED_PHOTO_MAX_EDGE_PX) return null;
  if (width >= height) return { width: STORED_PHOTO_MAX_EDGE_PX };
  return { height: STORED_PHOTO_MAX_EDGE_PX };
}

export function storedPhotoNeedsReencode(input: {
  mimeType: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
}): boolean {
  const jpeg =
    input.mimeType === 'image/jpeg' || /\.jpe?g$/i.test(input.fileName);
  const longEdge = Math.max(input.width, input.height);
  return !(
    jpeg &&
    longEdge > 0 &&
    longEdge <= STORED_PHOTO_MAX_EDGE_PX &&
    input.fileSize > 0 &&
    input.fileSize <= STORED_PHOTO_SKIP_REENCODE_BYTES
  );
}

const parsedServerMax = Number(process.env.GROWLOG_MAX_PHOTO_BYTES_VISION ?? '');
/** Worker / server: `GROWLOG_MAX_PHOTO_BYTES_VISION`. */
export const MAX_PHOTO_BYTES_VISION =
  Number.isFinite(parsedServerMax) && parsedServerMax > 0
    ? parsedServerMax
    : DEFAULT_MAX_PHOTO_BYTES_VISION;

/**
 * Клиент (браузер): в бандл попадает только `NEXT_PUBLIC_*`.
 * Для совпадения с воркером задайте то же значение, что и `GROWLOG_MAX_PHOTO_BYTES_VISION`.
 */
export function getMaxPhotoBytesVisionClient(): number {
  const n = Number(
    process.env.NEXT_PUBLIC_GROWLOG_MAX_PHOTO_BYTES_VISION ??
      process.env.EXPO_PUBLIC_GROWLOG_MAX_PHOTO_BYTES_VISION ??
      ''
  );
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PHOTO_BYTES_VISION;
}

export function formatPhotoSizeLimit(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} МБ`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }
  return `${bytes} Б`;
}
