'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { MockupVpdWidgetPanel } from '@/components/design-mockups/MockupVpdWidgetPanel';

/** Главная: тап по чипу VPD открывает тот же `VpdWidget`, что на проде (только новая оболочка). */
export function VpdExpandedMockup() {
  return (
    <MockupAppShell title="Фокус дня" activeTab="home">
      <div className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Снимок цикла и задачи свёрнуты — фокус на климате
        </div>
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm ring-2 ring-primary/20"
        >
          <span className="text-muted-foreground">Дефицит влаги (VPD)</span>
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">1,12 кПа</span>
        </button>
        <MockupVpdWidgetPanel preview highlightRh />
      </div>
    </MockupAppShell>
  );
}
