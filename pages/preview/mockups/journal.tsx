'use client';

import { JournalMockup } from '@/components/design-mockups/JournalMockup';
import { PreviewAppearance } from '@/components/preview/PreviewAppearance';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';

export default function MockupJournalPreviewPage() {
  useLocalhostPreviewGuard();
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 py-6">
      <PreviewAppearance />
      <JournalMockup />
    </div>
  );
}
