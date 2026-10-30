import { describe, expect, it } from 'vitest';

import { assistantPhotoOnlyDefaultQuestion } from '@/lib/assistant/locale';

describe('assistantPhotoOnlyDefaultQuestion', () => {
  it('returns Russian copy for ru locale', () => {
    expect(assistantPhotoOnlyDefaultQuestion('ru')).toMatch(/Проанализируй/);
  });

  it('falls back to English for unknown mapping', () => {
    expect(assistantPhotoOnlyDefaultQuestion('en')).toMatch(/Analyze this photo/);
  });
});
