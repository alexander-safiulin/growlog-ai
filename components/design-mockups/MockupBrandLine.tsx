'use client';

import { cn } from '@/lib/utils';
import { Sprout } from 'lucide-react';

/** Целевая строка бренда в редизайне (точный регистр, без ALL CAPS). */
export function MockupBrandLine({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold leading-none tracking-normal text-grow-moss',
        className
      )}
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Sprout className="h-3 w-3 shrink-0 text-grow-moss" aria-hidden />
        Growlog • OG Lab
      </span>
    </p>
  );
}
