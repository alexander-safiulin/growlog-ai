'use client';

import { HideNextDevIndicator } from '@/components/design-mockups/HideNextDevIndicator';
import { PreviewAppearance } from '@/components/preview/PreviewAppearance';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';
import type { ReactNode } from 'react';

/** 390×844 viewport frame for PNG capture (no page chrome). */
export function MockupPreviewFrame({ children }: { children: ReactNode }) {
  useLocalhostPreviewGuard();
  return (
    <div className="h-[844px] w-[390px] overflow-hidden bg-background">
      <PreviewAppearance />
      <HideNextDevIndicator />
      {children}
    </div>
  );
}
