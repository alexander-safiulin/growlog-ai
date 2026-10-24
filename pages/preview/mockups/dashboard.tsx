'use client';

import { DashboardMockup } from '@/components/design-mockups/DashboardMockup';
import { MockupPreviewFrame } from '@/components/design-mockups/MockupPreviewFrame';

export default function MockupDashboardPreviewPage() {
  return (
    <MockupPreviewFrame>
      <DashboardMockup />
    </MockupPreviewFrame>
  );
}
