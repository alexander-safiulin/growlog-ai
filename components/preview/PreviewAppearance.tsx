'use client';

import { useRouter } from 'next/router';
import { useEffect } from 'react';

export type PreviewAppearanceMode = 'light' | 'dark';

export function PreviewAppearance() {
  const router = useRouter();
  const raw = router.query.appearance;
  const appearance = raw === 'dark' ? 'dark' : raw === 'light' ? 'light' : null;

  useEffect(() => {
    if (!appearance) return;
    const root = document.documentElement;
    if (appearance === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appearance]);

  return null;
}
