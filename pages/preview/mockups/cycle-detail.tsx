'use client';

import { CycleDetailMockup } from '@/components/design-mockups/CycleDetailMockup';
import { MockupPreviewFrame } from '@/components/design-mockups/MockupPreviewFrame';
import { useRouter } from 'next/router';

export default function MockupCycleDetailPreviewPage() {
  const router = useRouter();
  const section = router.query.section === 'chronology' ? 'chronology' : 'overview';

  return (
    <MockupPreviewFrame>
      <CycleDetailMockup initialSection={section} />
    </MockupPreviewFrame>
  );
}
