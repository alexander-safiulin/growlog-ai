import { describe, expect, it } from 'vitest';
import { sopImportErrorI18nKey } from '@/lib/growlog/sop-import-errors';
import { hashSopImportSourceText } from '@/lib/growlog/sop-import-content-hash';

describe('sop-import-errors', () => {
  it('maps known API codes to i18n keys', () => {
    expect(sopImportErrorI18nKey('no_extractable_text')).toBe('sop.importErrors.noExtractableText');
    expect(sopImportErrorI18nKey('duplicate_document')).toBe('sop.importErrors.duplicateDocument');
  });

  it('falls back to generic', () => {
    expect(sopImportErrorI18nKey('unknown_code_xyz')).toBe('sop.importErrors.generic');
  });
});

describe('sop-import-content-hash', () => {
  it('is stable for trimmed text', () => {
    const a = hashSopImportSourceText('  hello sop  ');
    const b = hashSopImportSourceText('hello sop');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });
});
