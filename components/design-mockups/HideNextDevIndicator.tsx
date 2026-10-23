'use client';

import { useEffect } from 'react';

/** Hides Next.js dev overlay in localhost mockup screenshots. */
export function HideNextDevIndicator() {
  useEffect(() => {
    const id = 'mockup-hide-next-dev';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dialog],
      #__next-build-watcher,
      button[aria-label="Open Next.js Dev Tools"],
      [data-nextjs-dev-tools-button] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}
