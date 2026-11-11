'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { fetchSopDefinitions, SOP_RUNS_QUERY_KEY } from '@/lib/growlog/sop-queries';
import {
  loadOpenSopRunsForCycleDay,
  clearSopMaterializeOnce,
  sopMaterializeScopeKey,
  SOP_OPEN_RUNS_STALE_MS,
} from '@/lib/growlog/sop-open-runs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { SopDocumentImport } from '@/components/sop/SopDocumentImport';
import { SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED } from '@growlog/domain/growlog/sop-import-draft';
import { Plus } from 'lucide-react';

function SopIndexInner() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle, farms } = useFarmContext();
  const farm = farms.find((f) => f.id === farmId);

  const defsQuery = useQuery({
    queryKey: ['sop-definitions', farmId],
    enabled: !!farmId,
    queryFn: () => fetchSopDefinitions(supabase, farmId!),
  });

  const queryClient = useQueryClient();

  const runsQuery = useQuery({
    queryKey: [SOP_RUNS_QUERY_KEY, farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id && !!farm,
    staleTime: SOP_OPEN_RUNS_STALE_MS,
    queryFn: () =>
      loadOpenSopRunsForCycleDay(supabase, {
        farmId: farmId!,
        cycleId: cycle!.id,
        timezone: farm!.timezone ?? 'UTC',
      }),
  });

  if (!cycle) {
    return <p className="text-muted-foreground">{t('common.needActiveCycle')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('sop.intro')}</p>
        <Button asChild size="sm">
          <Link href="/sop/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('sop.newSop')}
          </Link>
        </Button>
      </div>

      <SopDocumentImport
        onCommitted={() => {
          if (farmId && cycle?.id) {
            clearSopMaterializeOnce(sopMaterializeScopeKey(farmId, cycle.id));
          }
          void queryClient.invalidateQueries({ queryKey: ['sop-definitions', farmId] });
          void queryClient.invalidateQueries({ queryKey: [SOP_RUNS_QUERY_KEY, farmId, cycle?.id] });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sop.activeRunsTitle')}</CardTitle>
          <CardDescription>{t('sop.activeRunsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          )}
          {runsQuery.error && (
            <p className="text-sm text-destructive">
              {(runsQuery.error as Error).message}
            </p>
          )}
          {runsQuery.data && runsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('sop.noOpenRunsHint')}</p>
          )}
          <ul className="space-y-2">
            {runsQuery.data?.map((r) => {
              const title =
                r.sop_definitions && typeof r.sop_definitions === 'object' && 'title' in r.sop_definitions
                  ? (r.sop_definitions as { title: string }).title
                  : 'SOP';
              const dueLabel = r.due_at
                ? t('sop.dueBy', {
                    date: new Date(r.due_at).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }),
                  })
                : null;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.status}
                      {dueLabel && ` · ${dueLabel}`}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/sop/run/${r.id}`}>{t('dailyFocus.execute')}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sop.definitionsTitle')}</CardTitle>
          <CardDescription>{t('sop.definitionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {defsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          )}
          <ul className="space-y-2">
            {defsQuery.data?.map((d) => {
              const notes = Array.isArray(d.schedule_unparsed)
                ? d.schedule_unparsed.filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
                : [];
              return (
                <li
                  key={d.id}
                  className="rounded-lg border border-border/80 bg-muted/15 px-3 py-2 text-sm space-y-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.title}</span>
                    {d.applies_to_scope ? (
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground border border-border/70">
                        {d.applies_to_scope}
                      </span>
                    ) : null}
                  </div>
                  {d.description ? (
                    <p className="text-muted-foreground text-xs leading-relaxed">{d.description}</p>
                  ) : null}
                  {notes.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t('sop.importScheduleUnparsed')}:{' '}
                      {notes
                        .map((note) =>
                          note === SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED
                            ? t('sop.importAppliesToScopeUnconfirmed')
                            : note
                        )
                        .join('; ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {defsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('sop.noDefinitionsHint')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SopPageBody() {
  const { t } = useTranslation();
  return (
    <>
      <PageHead titleKey="titles.sop" />
      <AppShell title={t('titles.sop')}>
        <SopIndexInner />
      </AppShell>
    </>
  );
}

export default function SopIndexPage() {
  return (
    <AppRouteReady>
      <SopPageBody />
    </AppRouteReady>
  );
}
