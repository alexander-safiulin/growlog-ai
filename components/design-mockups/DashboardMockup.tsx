'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { MockupTaskProgress, MockupTaskRow } from '@/components/design-mockups/MockupTaskRow';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Brain,
  Camera,
  ClipboardCheck,
  Droplets,
  Mic,
  Sparkles,
  Sprout,
} from 'lucide-react';

export function DashboardMockup() {
  return (
    <MockupAppShell title="Фокус дня" activeTab="home">
      <div className="space-y-3">
        <section className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-3.5 shadow-[var(--elev-1)]">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Снимок цикла</p>
          <p className="text-lg font-semibold leading-tight">Весна 2026</p>
          <p className="text-sm text-muted-foreground">День 24 · вегетация · сорт Критикал</p>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">
            Сегодня в журнале: <strong className="text-foreground">3</strong>
          </p>
          <button
            type="button"
            className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 text-sm"
          >
            <span className="text-muted-foreground">Дефицит влаги (VPD)</span>
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">1,12 кПа</span>
          </button>
        </section>

        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium">Влажность растёт ночью</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                За три ночи с 58 до 65 %. Проверьте отток воздуха до перехода в цветение.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-3.5 shadow-[var(--elev-1)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Задачи на сегодня</p>
            </div>
            <MockupTaskProgress done={2} total={3} />
          </div>
          <ul className="mt-1 divide-y divide-border/60">
            <li>
              <MockupTaskRow label="Проверить pH и EC" state="done" />
            </li>
            <li>
              <MockupTaskRow label="Формировка кроны" state="overdue" />
            </li>
            <li>
              <MockupTaskRow label="Полив по весу горшка" state="open" />
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-grow-leaf/20 bg-grow-sage/25 p-3.5 dark:bg-grow-sage/10">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-primary">
            <Brain className="h-4 w-4" />
            Фокус советника
            <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              уверенность средняя
            </span>
          </div>
          <p className="mt-2 text-sm leading-snug text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
            Кормления ровные, EC в целевом коридоре. Зафиксируйте высоту куста для сравнения через неделю.
          </p>
          <Button variant="outline" size="sm" className="mt-2.5 h-11 w-full rounded-xl text-sm">
            Спросить советника
          </Button>
        </section>

        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Быстрые действия</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Замер', icon: Droplets },
              { label: 'Фото', icon: Camera },
              { label: 'Голос', icon: Mic },
              { label: 'Цикл', icon: Sprout },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-card px-1 text-[10px] font-medium shadow-[var(--elev-1)]"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </MockupAppShell>
  );
}
