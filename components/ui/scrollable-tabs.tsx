'use client';

import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ScrollableTabItem<T extends string> = {
  id: T;
  label: string;
};

export function ScrollableTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  items: ScrollableTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  'aria-label'?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setFadeLeft(scrollLeft > 4);
    setFadeRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateFades();
    const el = scrollerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, updateFades]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-tab-id="${value}"]`);
    requestAnimationFrame(() => {
      active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      updateFades();
    });
  }, [value, items, updateFades]);

  return (
    <div className={cn('relative -mx-4 px-4', className)}>
      {fadeLeft && (
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-card via-card/80 to-transparent"
          aria-hidden
        />
      )}
      {fadeRight && (
        <div
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-card via-card/80 to-transparent"
          aria-hidden
        />
      )}
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label={ariaLabel}
        onScroll={updateFades}
        className="flex snap-x snap-mandatory gap-1 overflow-x-auto pb-1 scrollbar-none"
      >
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              data-tab-id={item.id}
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={cn(
                'snap-start shrink-0 min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
