import { NutrientHelpPageContent } from '@/components/nutrient/help/NutrientHelpPageContent';
import { NutrientPageShell } from '@/components/nutrient/NutrientPageShell';
import { HreflangHead } from '@/components/layout/HreflangHead';

export default function NutrientHelpPage() {
  return (
    <>
      <HreflangHead path="/nutrient/help" />
      <NutrientPageShell titleKey="titles.nutrientHelp">
        <NutrientHelpPageContent />
      </NutrientPageShell>
    </>
  );
}
