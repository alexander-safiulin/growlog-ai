'use client';

import { JournalMockup } from '@/components/design-mockups/JournalMockup';
import { MockupPreviewFrame } from '@/components/design-mockups/MockupPreviewFrame';

export default function MockupJournalPreviewPage() {
  return (
    <MockupPreviewFrame>
      <JournalMockup />
    </MockupPreviewFrame>
  );
}
