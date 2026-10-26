import { useFarmContext } from '@/providers/FarmProvider';
import {
  farmCalendarDateString,
  fetchCycleEventsInRange,
  fetchCycleFeedingRowsForRange,
  groupEventsByFarmDay,
  localJournalFeedingRows,
  localJournalToEventRows,
  monthUtcBoundsForFarmMonth,
  parseCalendarDateParts,
  shiftFarmMonth,
  type EventRow,
  type FeedDaySection,
  type RawFeedingRow,
} from '@growlog/domain';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export const FEED_EVENTS_QUERY_KEY = 'feed-events';

type FeedMonthPage = {
  year: number;
  month: number;
  events: EventRow[];
  feedingRows: RawFeedingRow[];
};

export function useFeedEvents() {
  const { supabase, farmId, cycle, farms, isLocalWorkspace, localWorkspace } = useFarmContext();
  const farmTz =
    farms.find((f) => f.id === farmId)?.timezone ?? localWorkspace?.cycle.timezone ?? 'UTC';
  const today = farmCalendarDateString(farmTz);
  const cycleStartParts = cycle ? parseCalendarDateParts(cycle.start_date) : null;
  const [startY, startM] = today.split('-').map(Number);

  const query = useInfiniteQuery({
    queryKey: [FEED_EVENTS_QUERY_KEY, farmId, cycle?.id, isLocalWorkspace],
    enabled: !!farmId && !!cycle?.id,
    initialPageParam: { year: startY, month: startM },
    queryFn: async ({ pageParam }): Promise<FeedMonthPage> => {
      const bounds = monthUtcBoundsForFarmMonth(pageParam.year, pageParam.month, farmTz);
      if (isLocalWorkspace && localWorkspace) {
        const events = localJournalToEventRows(localWorkspace).filter(
          (e) => e.occurred_at >= bounds.fromIso && e.occurred_at < bounds.toIso,
        );
        const feedingRows = localJournalFeedingRows(localWorkspace).filter(
          (r) => r.occurred_at >= bounds.fromIso && r.occurred_at < bounds.toIso,
        );
        return { year: pageParam.year, month: pageParam.month, events, feedingRows };
      }
      const [events, feedingRows] = await Promise.all([
        fetchCycleEventsInRange(supabase, {
          farmId: farmId!,
          cycleId: cycle!.id,
          fromIso: bounds.fromIso,
          toIso: bounds.toIso,
        }),
        fetchCycleFeedingRowsForRange(supabase, {
          farmId: farmId!,
          cycleId: cycle!.id,
          fromIso: bounds.fromIso,
          toIso: bounds.toIso,
        }),
      ]);
      return { year: pageParam.year, month: pageParam.month, events, feedingRows };
    },
    getNextPageParam: (lastPage) => {
      if (!cycleStartParts) return undefined;
      const older = shiftFarmMonth(lastPage.year, lastPage.month, -1);
      const startIndex = cycleStartParts.year * 12 + cycleStartParts.month;
      const olderIndex = older.year * 12 + older.month;
      if (olderIndex < startIndex) return undefined;
      return older;
    },
  });

  const { sections, feedingByEventId } = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const eventIds = new Set<string>();
    const feedIds = new Set<string>();
    const allEvents: EventRow[] = [];
    const allFeeding: RawFeedingRow[] = [];
    for (const page of pages) {
      for (const ev of page.events) {
        if (eventIds.has(ev.id)) continue;
        eventIds.add(ev.id);
        allEvents.push(ev);
      }
      for (const row of page.feedingRows) {
        if (feedIds.has(row.event_id)) continue;
        feedIds.add(row.event_id);
        allFeeding.push(row);
      }
    }
    const sections: FeedDaySection[] = groupEventsByFarmDay(allEvents, farmTz);
    const feedingByEventId = new Map(allFeeding.map((r) => [r.event_id, r]));
    return { sections, feedingByEventId };
  }, [query.data?.pages, farmTz]);

  return {
    ...query,
    sections,
    feedingByEventId,
    farmTz,
    today,
  };
}
