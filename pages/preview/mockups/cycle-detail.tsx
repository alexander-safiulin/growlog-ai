'use client';

import { CycleDetailMockup } from '@/components/design-mockups/CycleDetailMockup';
import { PreviewAppearance } from '@/components/preview/PreviewAppearance';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';

export default function MockupCycleDetailPreviewPage() {
  useLocalhostPreviewGuard();
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 py-6">
      <PreviewAppearance />
      <CycleDetailMockup />
    </div>
  );
}
