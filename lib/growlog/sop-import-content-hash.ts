import { createHash } from 'node:crypto';

export function hashSopImportSourceText(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex');
}
