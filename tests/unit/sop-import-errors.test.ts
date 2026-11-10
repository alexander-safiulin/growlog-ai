import { describe, expect, it } from 'vitest';
import { matchSopImportErrorCode, sopImportErrorI18nKey } from '@/lib/growlog/sop-import-errors';
import { hashSopImportSourceText } from '@/lib/growlog/sop-import-content-hash';

describe('sop-import-errors', () => {
  it('maps known API codes to i18n keys', () => {
    expect(sopImportErrorI18nKey('no_extractable_text')).toBe('sop.importErrors.noExtractableText');
    expect(sopImportErrorI18nKey('duplicate_document')).toBe('sop.importErrors.duplicateDocument');
    expect(sopImportErrorI18nKey('duplicate_check_failed')).toBe(
      'sop.importErrors.duplicateCheckFailed'
    );
    expect(sopImportErrorI18nKey('missing_applies_to_scope')).toBe(
      'sop.importErrors.missingAppliesToScope'
    );
  });

  it('reads a Postgres exception tail as an import code', () => {
    expect(matchSopImportErrorCode('duplicate_document')).toBe('duplicate_document');
    expect(matchSopImportErrorCode('error: missing_applies_to_scope')).toBe(
      'missing_applies_to_scope'
    );
    expect(matchSopImportErrorCode('relation sop_definitions does not exist')).toBeNull();
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
