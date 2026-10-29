import { FEED_EVENTS_QUERY_KEY } from '@/components/feed/feedEventsQueryKey';
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
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const todayParts = parseCalendarDateParts(today);
  const cycleStartParts = cycle ? parseCalendarDateParts(cycle.start_date) : null;
  const [lead, setLead] = useState(todayParts);

  useEffect(() => {
    const todayIndex = todayParts.year * 12 + todayParts.month;
    setLead((prev) => (prev.year * 12 + prev.month < todayIndex ? todayParts : prev));
  }, [todayParts.year, todayParts.month]);
  const journalStamp = isLocalWorkspace
    ? `${localWorkspace?.journal.length ?? 0}:${localWorkspace?.journal[localWorkspace.journal.length - 1]?.id ?? ''}`
    : 'cloud';

  const query = useInfiniteQuery({
    queryKey: [FEED_EVENTS_QUERY_KEY, farmId, cycle?.id, isLocalWorkspace, journalStamp, lead.year, lead.month],
    enabled: !!farmId && !!cycle?.id,
    initialPageParam: { year: lead.year, month: lead.month },
    placeholderData: keepPreviousData,
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
        if (ev.event_type === 'photo_capture' && ev.payload?.parent_event_id) continue;
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

  const leadIndex = lead.year * 12 + lead.month;
  const todayIndex = todayParts.year * 12 + todayParts.month;

  useEffect(() => {
    const pages = query.data?.pages;
    if (!pages?.length || query.isFetchingNextPage || query.isError || !query.hasNextPage) return;
    if (leadIndex <= todayIndex) return;
    const oldest = pages[pages.length - 1];
    if (oldest.year * 12 + oldest.month > todayIndex) void query.fetchNextPage();
  }, [leadIndex, todayIndex, query.data?.pages, query.isFetchingNextPage, query.isError, query.hasNextPage, query.fetchNextPage]);

  const loadedMonths = useMemo(() => {
    const set = new Set<number>();
    for (const page of query.data?.pages ?? []) set.add(page.year * 12 + page.month);
    return set;
  }, [query.data?.pages]);

  const ensureMonth = useCallback(
    (date: string) => {
      const parts = parseCalendarDateParts(date);
      const target = parts.year * 12 + parts.month;
      if (target > lead.year * 12 + lead.month) {
        setLead(parts);
        return;
      }
      if (loadedMonths.has(target) || query.isFetchingNextPage || query.isError || !query.hasNextPage) return;
      const pages = query.data?.pages ?? [];
      const oldest = pages[pages.length - 1];
      if (oldest && oldest.year * 12 + oldest.month > target) void query.fetchNextPage();
    },
    [
      lead.year,
      lead.month,
      loadedMonths,
      query.isFetchingNextPage,
      query.isError,
      query.hasNextPage,
      query.data?.pages,
      query.fetchNextPage,
    ],
  );

  const isMonthLoaded = useCallback(
    (date: string) => {
      const parts = parseCalendarDateParts(date);
      return loadedMonths.has(parts.year * 12 + parts.month);
    },
    [loadedMonths],
  );

  return {
    ...query,
    sections,
    feedingByEventId,
    farmTz,
    today,
    ensureMonth,
    isMonthLoaded,
  };
}
