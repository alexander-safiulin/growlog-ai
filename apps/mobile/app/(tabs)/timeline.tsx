import { CycleCalendarBlock } from '@/components/cycle/CycleCalendarBlock';
import { CycleOverviewSheet } from '@/components/feed/CycleOverviewSheet';
import { FeedEventCard } from '@/components/feed/FeedEventCard';
import { TimelineAddMenu } from '@/components/feed/TimelineAddMenu';
import { useFeedEvents } from '@/components/feed/useFeedEvents';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  cycleDayNumber,
  formatGrowerCalendarDate,
  growerStageLabelRu,
} from '@growlog/domain';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';

type FeedItem = { id: string; eventId: string };
type FeedSection = { title: string; date: string; data: FeedItem[] };

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 };
const EMPTY_PREFIX = '__empty__:';

export default function TimelineScreen() {
  const { strings, locale } = useMobileLocale();
  const tl = strings.timelineScreen;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { cycle, farms, farmId, loading } = useFarmContext();
  const navigation = useNavigation();
  const router = useRouter();
  const listRef = useRef<SectionList<FeedItem, FeedSection>>(null);

  const {
    sections,
    feedingByEventId,
    farmTz,
    today,
    isLoading: feedLoading,
    isError: feedError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    ensureMonth,
    isMonthLoaded,
  } = useFeedEvents();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const scrollSyncRef = useRef(false);
  const userScrolledRef = useRef(false);
  const pendingSectionRef = useRef<number | null>(null);
  const pendingScrollDateRef = useRef<string | null>(null);
  const emptyDayLastTapRef = useRef(0);

  const onEmptyDayPress = useCallback(() => {
    const now = Date.now();
    if (now - emptyDayLastTapRef.current < 320) {
      emptyDayLastTapRef.current = 0;
      setAddMenuOpen(true);
      return;
    }
    emptyDayLastTapRef.current = now;
  }, []);

  useEffect(() => {
    if (selectedDate === null && today) setSelectedDate(today);
  }, [today, selectedDate]);

  const farmTzResolved = farms.find((f) => f.id === farmId)?.timezone ?? farmTz;
  const stageLabel = cycle ? growerStageLabelRu(cycle.stage) : '';
  const dayNum = cycle ? cycleDayNumber({ startDate: cycle.start_date, timeZone: farmTzResolved }) : 0;

  const headerSubtitle = cycle
    ? tl.headerMeta.replace('{day}', String(dayNum)).replace('{stage}', stageLabel)
    : '';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={() => setOverviewOpen(true)} disabled={!cycle} accessibilityRole="button">
          <Text style={{ fontWeight: '600', color: colors.text, fontSize: 17 }} numberOfLines={1}>
            {cycle?.name ?? strings.tabs.timeline}
          </Text>
          {cycle ? (
            <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
              {headerSubtitle}
            </Text>
          ) : null}
        </Pressable>
      ),
      headerRight: () =>
        cycle ? (
          <Pressable
            onPress={() => setAddMenuOpen(true)}
            hitSlop={12}
            accessibilityLabel={tl.addA11y}
            style={{ paddingHorizontal: 12 }}
          >
            <Text style={{ fontSize: 28, fontWeight: '300', color: colors.primary, lineHeight: 28 }}>+</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, cycle, colors, headerSubtitle, strings.tabs.timeline, tl.addA11y]);

  const listSections: FeedSection[] = useMemo(() => {
    const built: FeedSection[] = sections.map((s) => ({
      title: s.date,
      date: s.date,
      data: s.events.map((ev) => ({ id: ev.id, eventId: ev.id })),
    }));
    if (selectedDate && isMonthLoaded(selectedDate) && !built.some((s) => s.date === selectedDate)) {
      built.push({
        title: selectedDate,
        date: selectedDate,
        data: [{ id: `${EMPTY_PREFIX}${selectedDate}`, eventId: '' }],
      });
      built.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    return built;
  }, [sections, selectedDate, isMonthLoaded]);

  const eventById = useMemo(() => {
    const map = new Map<string, (typeof sections)[0]['events'][0]>();
    for (const sec of sections) {
      for (const ev of sec.events) map.set(ev.id, ev);
    }
    return map;
  }, [sections]);

  const scrollToDate = useCallback(
    (date: string) => {
      const index = listSections.findIndex((s) => s.date === date);
      if (index < 0) return;
      scrollSyncRef.current = true;
      pendingSectionRef.current = index;
      listRef.current?.scrollToLocation({
        sectionIndex: index,
        itemIndex: 0,
        viewOffset: 8,
        animated: true,
      });
      setTimeout(() => {
        scrollSyncRef.current = false;
      }, 400);
    },
    [listSections],
  );

  const onSelectCalendarDate = useCallback(
    (date: string) => {
      pendingScrollDateRef.current = date;
      setSelectedDate(date);
      ensureMonth(date);
      scrollToDate(date);
    },
    [ensureMonth, scrollToDate],
  );

  useEffect(() => {
    const date = pendingScrollDateRef.current;
    if (!date || !listSections.some((s) => s.date === date)) return;
    pendingScrollDateRef.current = null;
    scrollToDate(date);
  }, [listSections, scrollToDate]);

  useEffect(() => {
    if (selectedDate) ensureMonth(selectedDate);
  }, [selectedDate, sections, ensureMonth]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (scrollSyncRef.current || !userScrolledRef.current) return;
    const first = viewableItems.find((v) => v.isViewable && v.index != null && v.section);
    if (first?.section && typeof first.section === 'object' && 'date' in first.section) {
      const date = (first.section as FeedSection).date;
      setSelectedDate((prev) => (prev === date ? prev : date));
    }
  }).current;

  if (loading || (feedLoading && sections.length === 0)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>{tl.loading}</Text>
      </View>
    );
  }

  if (!cycle) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{tl.noCycle}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/cycle/new')}>
          <Text style={styles.primaryBtnText}>{strings.cycle.newCycle}</Text>
        </Pressable>
      </View>
    );
  }

  const selected = selectedDate ?? today;

  return (
    <View style={styles.screen}>
      <View style={styles.calendarWrap}>
        <CycleCalendarBlock
          selectedDate={selected}
          onSelectDate={onSelectCalendarDate}
          displayMode={calendarExpanded ? 'month' : 'week'}
          onToggleDisplayMode={() => setCalendarExpanded((v) => !v)}
        />
        <Pressable onPress={() => setCalendarExpanded((v) => !v)} style={styles.calToggle}>
          <Text style={styles.calToggleText}>
            {calendarExpanded ? tl.collapseMonth : tl.expandMonth}
          </Text>
        </Pressable>
      </View>

      <SectionList<FeedItem, FeedSection>
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={listSections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        onScrollBeginDrag={() => {
          userScrolledRef.current = true;
        }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        ListEmptyComponent={
          <Text style={styles.muted}>{feedError ? strings.commonMobile.error : tl.empty}</Text>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
          ) : null
        }
        renderSectionHeader={({ section }) => {
          const label =
            section.date === today
              ? tl.today
              : formatGrowerCalendarDate(section.date, locale, { includeYear: true });
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{label}</Text>
            </View>
          );
        }}
        renderItem={({ item }) => {
          if (!item.eventId) {
            return (
              <Pressable
                onPress={onEmptyDayPress}
                style={styles.dayEmptyArea}
                accessibilityRole="button"
                accessibilityLabel={tl.addA11y}
              >
                <Text style={styles.dayEmpty}>{strings.cycle.calDayEmpty}</Text>
              </Pressable>
            );
          }
          const event = eventById.get(item.eventId);
          if (!event) return null;
          return (
            <FeedEventCard event={event} feedingRow={feedingByEventId.get(event.id)} />
          );
        }}
        onScrollToIndexFailed={() => {
          const index = pendingSectionRef.current;
          if (index == null) return;
          setTimeout(() => {
            listRef.current?.scrollToLocation({
              sectionIndex: index,
              itemIndex: 0,
              viewOffset: 8,
              animated: true,
            });
          }, 80);
        }}
      />

      <CycleOverviewSheet visible={overviewOpen} onClose={() => setOverviewOpen(false)} />
      <TimelineAddMenu
        visible={addMenuOpen}
        selectedDate={selected}
        onClose={() => setAddMenuOpen(false)}
        onOpenCycleSheet={() => setOverviewOpen(true)}
      />
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screen },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.screen },
    calendarWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: c.border },
    calToggle: { alignSelf: 'center', paddingVertical: 4 },
    calToggleText: { fontSize: 12, fontWeight: '600', color: c.primary },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 12, paddingBottom: 24, flexGrow: 1 },
    sectionHeader: {
      backgroundColor: c.screen,
      paddingVertical: 8,
      paddingTop: 12,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: c.sectionLabel, textTransform: 'uppercase' },
    muted: { color: c.textMuted, textAlign: 'center', padding: 24 },
    dayEmptyArea: { minHeight: 280, flexGrow: 1 },
    dayEmpty: { color: c.textMuted, fontSize: 14, paddingBottom: 12 },
    primaryBtn: {
      marginTop: 16,
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    primaryBtnText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
  });
}
