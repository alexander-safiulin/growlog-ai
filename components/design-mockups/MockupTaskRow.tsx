'use client';

import { cn } from '@/lib/utils';
import { Check, Clock } from 'lucide-react';

export type MockupTaskState = 'open' | 'done' | 'overdue';

export function MockupTaskRow({
  label,
  state,
  trailing,
  className,
}: {
  label: string;
  state: MockupTaskState;
  /** e.g. scheduled time — not shown for done tasks in mockups */
  trailing?: string;
  className?: string;
}) {
  const done = state === 'done';
  const overdue = state === 'overdue';

  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-3 py-1.5',
        className
      )}
    >
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={done ? `Снять отметку: ${label}` : `Отметить выполненным: ${label}`}
        aria-pressed={done}
      >
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
            done
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/45 bg-background'
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <p
          className={cn(
            'text-sm leading-snug',
            done && 'text-muted-foreground line-through decoration-muted-foreground/70',
            overdue && !done && 'text-foreground'
          )}
        >
          {label}
        </p>
        {overdue && !done ? (
          <span className="inline-flex shrink-0" role="img" aria-label="Просрочено">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
          </span>
        ) : null}
      </div>
      {trailing && !done ? (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{trailing}</span>
      ) : null}
    </div>
  );
}

/** Decorative progress: 2 of 3 complete */
export function MockupTaskProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 9;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label={`Выполнено ${done} из ${total}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90" aria-hidden>
        <circle cx="11" cy="11" r={r} fill="none" className="stroke-muted" strokeWidth="2.5" />
        <circle
          cx="11"
          cy="11"
          r={r}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="tabular-nums">{done} из {total}</span>
    </div>
  );
}
