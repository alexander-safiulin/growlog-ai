import { describe, expect, it } from 'vitest';
import {
  X_ROBOTS_NOINDEX,
  applyNoIndexHeader,
  shouldSendNoIndexHeader,
} from '@/lib/seo/noindex-headers';

describe('shouldSendNoIndexHeader', () => {
  it('allows indexable marketing paths', () => {
    expect(shouldSendNoIndexHeader('/')).toBe(false);
    expect(shouldSendNoIndexHeader('/help')).toBe(false);
    expect(shouldSendNoIndexHeader('/nutrient/calculator')).toBe(false);
  });

  it('blocks app shell and auth routes', () => {
    expect(shouldSendNoIndexHeader('/dashboard')).toBe(true);
    expect(shouldSendNoIndexHeader('/auth/login')).toBe(true);
    expect(shouldSendNoIndexHeader('/auth/callback')).toBe(true);
    expect(shouldSendNoIndexHeader('/timeline')).toBe(true);
    expect(shouldSendNoIndexHeader('/cycle/log')).toBe(true);
  });

  it('does not treat /login-like paths as /log', () => {
    expect(shouldSendNoIndexHeader('/auth/login')).toBe(true);
    expect(shouldSendNoIndexHeader('/help')).toBe(false);
  });

  it('blocks API routes', () => {
    expect(shouldSendNoIndexHeader('/api/health/adr013')).toBe(true);
  });
});

describe('applyNoIndexHeader', () => {
  it('sets X-Robots-Tag for noindex paths', () => {
    const headers = new Headers();
    applyNoIndexHeader(headers, '/dashboard');
    expect(headers.get('X-Robots-Tag')).toBe(X_ROBOTS_NOINDEX);
  });

  it('leaves marketing paths without the header', () => {
    const headers = new Headers();
    applyNoIndexHeader(headers, '/');
    expect(headers.get('X-Robots-Tag')).toBeNull();
  });
});
