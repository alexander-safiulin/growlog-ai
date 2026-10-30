'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Droplets, Leaf, Thermometer } from 'lucide-react';

/** Static visual parity with `VpdWidget` — behavior stays in production code only. */
export function MockupVpdWidgetPanel({
  preview = false,
  highlightRh,
  className,
}: {
  preview?: boolean;
  highlightRh?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-[var(--elev-1)]', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold">Дефицит влаги (VPD)</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            Данные SmartLife. Пробные значения сбрасываются через 3 с, в журнал не попадают.
          </p>
        </div>
        {preview ? (
          <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">Проба</span>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground">VPD</p>
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
          1,12<span className="ml-1 text-lg font-normal text-muted-foreground">кПа</span>
        </p>
        <p className="text-xs text-muted-foreground">Цель (вегетация) · в коридоре</p>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">Долгое нажатие — выбор датчика</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricChip label="Воздух" icon={<Thermometer className="h-3.5 w-3.5" />} value="24,2 °C" sub="Датчик гроубокса" />
        <MetricChip
          label="Лист"
          icon={<Leaf className="h-3.5 w-3.5" />}
          value="23,8 °C"
          sub="Не задан"
          dashed
        />
        <MetricChip
          label="Влажность"
          icon={<Droplets className="h-3.5 w-3.5" />}
          value="58 %"
          sub="Будка у окна"
          active={highlightRh}
        />
      </div>
    </div>
  );
}

function MetricChip({
  label,
  icon,
  value,
  sub,
  dashed,
  active,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  sub: string;
  dashed?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-2 py-2 text-left',
        dashed ? 'border-dashed border-border' : 'border-border',
        active && 'ring-2 ring-primary/40'
      )}
    >
      <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums leading-tight">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
