'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { NutrientHelpMath } from '@/components/nutrient/help/NutrientHelpMath';
import type { NutrientHelpInnerBlock } from '@/lib/nutrient/help/types';

function renderInner(block: NutrientHelpInnerBlock) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>;
    case 'heading':
      return <p className="text-sm font-medium text-foreground">{block.text}</p>;
    case 'list':
      if (block.ordered) {
        return (
          <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'math':
      return <NutrientHelpMath latex={block.latex} display={block.display} />;
    default:
      return null;
  }
}

export function NutrientHelpCurious({ blocks }: { blocks: NutrientHelpInnerBlock[] }) {
  const { t } = useTranslation();
  return (
    <details
      data-testid="nutrient-help-curious"
      className="group rounded-lg border border-border bg-muted/20 my-3 open:bg-muted/30"
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-foreground flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <span>{t('nutrient.help.curiousTitle')}</span>
        <span className="text-muted-foreground text-xs group-open:hidden">{t('nutrient.help.curiousExpand')}</span>
        <span className="text-muted-foreground text-xs hidden group-open:inline">{t('nutrient.help.curiousCollapse')}</span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/60">{blocks.map((b, i) => <div key={i}>{renderInner(b)}</div>)}</div>
    </details>
  );
}
