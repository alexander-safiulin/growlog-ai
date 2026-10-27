'use client';

import Link from 'next/link';
import { NutrientHelpCurious } from '@/components/nutrient/help/NutrientHelpCurious';
import { NutrientHelpMath } from '@/components/nutrient/help/NutrientHelpMath';
import { useTranslation } from '@/components/providers/I18nProvider';
import { examplesById } from '@/lib/nutrient/help/compute-examples';
import type {
  NutrientHelpBlock,
  NutrientHelpInnerBlock,
  NutrientHelpLocaleContent,
  NutrientHelpSection,
} from '@/lib/nutrient/help/types';

function renderInnerBlock(block: NutrientHelpInnerBlock) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-sm leading-relaxed text-foreground/90">{block.text}</p>;
    case 'heading':
      if (block.level === 2) {
        return <h2 className="text-lg font-semibold mt-6 mb-2">{block.text}</h2>;
      }
      return <h3 className="text-base font-semibold mt-4 mb-2">{block.text}</h3>;
    case 'list':
      if (block.ordered) {
        return (
          <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
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

function renderBlock(block: NutrientHelpBlock, exampleLocale: string) {
  switch (block.type) {
    case 'curious':
      return <NutrientHelpCurious blocks={block.blocks} />;
    case 'paragraph':
    case 'heading':
    case 'list':
    case 'math':
      return renderInnerBlock(block);
    case 'example': {
      const ex = examplesById(exampleLocale)[block.exampleId];
      if (!ex) return null;
      return (
        <aside className="rounded-md border border-border bg-muted/40 px-3 py-2 my-3 text-sm">
          <p className="font-medium text-foreground mb-1">{ex.title}</p>
          <ul className="space-y-1 text-muted-foreground">
            {ex.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </aside>
      );
    }
    case 'link':
      return (
        <p className="text-sm">
          <Link href={block.href} className="text-primary underline underline-offset-2">
            {block.text}
          </Link>
        </p>
      );
    default:
      return null;
  }
}

function SectionBody({ section, exampleLocale }: { section: NutrientHelpSection; exampleLocale: string }) {
  return (
    <article id={section.id} className="scroll-mt-20 border-b border-border pb-8 last:border-0">
      <h2 className="text-xl font-semibold mb-1">{section.title}</h2>
      <p className="text-sm text-muted-foreground mb-4">{section.summary}</p>
      <div className="space-y-3">
        {section.blocks.map((b, i) => (
          <div key={i}>{renderBlock(b, exampleLocale)}</div>
        ))}
      </div>
    </article>
  );
}

export function NutrientHelpView({ content }: { content: NutrientHelpLocaleContent }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-[390px] sm:max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{content.pageTitle}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{content.pageIntro}</p>
      <nav className="rounded-lg border border-border p-3 bg-muted/30">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          {t('nutrient.help.toc')}
        </p>
        <ul className="space-y-1 text-sm">
          {content.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-primary hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-8">
        {content.sections.map((s) => (
          <SectionBody key={s.id} section={s} exampleLocale={content.locale} />
        ))}
      </div>
    </div>
  );
}
