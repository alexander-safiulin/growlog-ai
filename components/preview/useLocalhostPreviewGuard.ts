'use client';

import { useRouter } from 'next/router';
import { useEffect } from 'react';

/** Blocks preview routes outside local dev (screenshots / design review). */
export function useLocalhostPreviewGuard() {
  const router = useRouter();
  useEffect(() => {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      void router.replace('/');
    }
  }, [router]);
}
