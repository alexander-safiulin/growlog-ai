'use client';

import { DashboardMockup } from '@/components/design-mockups/DashboardMockup';
import { PreviewAppearance } from '@/components/preview/PreviewAppearance';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';

export default function MockupDashboardPreviewPage() {
  useLocalhostPreviewGuard();
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 py-6">
      <PreviewAppearance />
      <DashboardMockup />
    </div>
  );
}
