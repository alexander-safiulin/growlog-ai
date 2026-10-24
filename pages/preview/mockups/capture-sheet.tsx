'use client';

import { CaptureSheetMockup } from '@/components/design-mockups/CaptureSheetMockup';
import { MockupPreviewFrame } from '@/components/design-mockups/MockupPreviewFrame';

export default function MockupCaptureSheetPreviewPage() {
  return (
    <MockupPreviewFrame>
      <CaptureSheetMockup />
    </MockupPreviewFrame>
  );
}
