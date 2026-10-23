import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function PageSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {children}
    </section>
  );
}
