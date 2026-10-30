'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { cn } from '@/lib/utils';
import { Camera, ClipboardList, Droplets, Mic, PenLine } from 'lucide-react';

const ACTIONS = [
  { label: 'Текст', desc: 'Запись в журнал', icon: PenLine },
  { label: 'Голос', desc: 'Расшифровка и проверка', icon: Mic },
  { label: 'Фото', desc: 'С подписью к циклу', icon: Camera },
  { label: 'Замер', desc: 'pH, EC, климат', icon: Droplets },
  { label: 'Кормление', desc: 'Из калькулятора', icon: ClipboardList },
];

/**
 * Quick-add sheet over главная; tab bar stays visible under the sheet edge.
 */
export function CaptureSheetMockup() {
  return (
    <div className="relative h-full min-h-[844px] w-full overflow-hidden">
      <div className="absolute inset-0 scale-[0.98] opacity-40 blur-[1px]">
        <MockupAppShell title="Фокус дня" activeTab="home" dimmed>
          <p className="text-sm text-muted-foreground">…</p>
        </MockupAppShell>
      </div>

      <div
        className="absolute inset-0 bg-foreground/25"
        aria-hidden
      />

      <div
        className="absolute inset-x-0 bottom-0 z-40 flex max-h-[85%] flex-col rounded-t-2xl border border-border bg-card shadow-[var(--elev-2)]"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="px-4 pb-2 pt-3">
          <h2 className="text-lg font-semibold">Новая запись</h2>
          <p className="text-sm text-muted-foreground">Гроубокс 1 · Весна 2026</p>
        </div>
        <ul className="flex-1 overflow-y-auto px-3 pb-2">
          {ACTIONS.map(({ label, desc, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left active:bg-muted/60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div
          className="border-t border-grow-leaf/15 bg-card/95 px-0.5 pt-1"
          style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-end justify-between opacity-90">
            {['Главная', 'Журнал', 'Запись', 'Циклы', 'Ещё'].map((label, i) => (
              <div
                key={label}
                className={cn(
                  'flex min-h-10 flex-1 flex-col items-center justify-center text-[9px] font-semibold',
                  i === 2 ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {i === 2 ? (
                  <span className="-mt-3 mb-0.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <PenLine className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="h-5" />
                )}
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
