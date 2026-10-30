import { describe, expect, it } from 'vitest';

import { uniqueFeedSystemName } from '@growlog/domain';

describe('uniqueFeedSystemName', () => {
  it('returns base when unused', () => {
    expect(uniqueFeedSystemName('Моя программа', ['Другая'])).toBe('Моя программа');
  });

  it('appends suffix when name taken', () => {
    expect(uniqueFeedSystemName('Моя программа', ['Моя программа'])).toBe('Моя программа 2');
    expect(uniqueFeedSystemName('Моя программа', ['Моя программа', 'Моя программа 2'])).toBe(
      'Моя программа 3',
    );
  });
});
