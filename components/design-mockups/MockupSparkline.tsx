'use client';

import { cn } from '@/lib/utils';

/** Decorative sparkline for design mockups only (not live data). */
export function MockupSparkline({
  values,
  className,
  strokeClassName = 'stroke-primary',
  fillClassName = 'fill-primary/15',
}: {
  values: number[];
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
}) {
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const line = pts.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-9 w-full', className)} aria-hidden>
      <polygon points={area} className={fillClassName} />
      <polyline
        points={line}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
      />
    </svg>
  );
}
