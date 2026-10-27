import { SiteHelpPage } from '@/components/help/SiteHelpPage';
import { HreflangHead } from '@/components/layout/HreflangHead';

export default function HelpPage() {
  return (
    <>
      <HreflangHead path="/help" />
      <SiteHelpPage />
    </>
  );
}
