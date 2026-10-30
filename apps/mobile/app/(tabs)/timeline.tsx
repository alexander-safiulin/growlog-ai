import { CycleCalendarBlock } from '@/components/cycle/CycleCalendarBlock';
import { CycleOverviewSheet } from '@/components/feed/CycleOverviewSheet';
import { EventDetailSheet } from '@/components/feed/EventDetailSheet';
import { FeedEventCard, feedEventTypeLabel } from '@/components/feed/FeedEventCard';
import { TimelineAddMenu } from '@/components/feed/TimelineAddMenu';
import { useFeedEvents } from '@/components/feed/useFeedEvents';
import { CycleContextBar } from '@/components/layout/CycleContextBar';
import { FocusedPlantBar } from '@/components/layout/FocusedPlantBar';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  formatGrowerCalendarDate,
  isFutureFarmCalendarDate,
  resolvedEventPhotoAttachments,
  resolvedEventStoragePaths,
  type EventRow,
} from '@growlog/domain';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';

type FeedItem = { id: string; eventId: string; addZone?: boolean; showEmptyLabel?: boolean };
type FeedSection = { title: string; date: string; data: FeedItem[] };

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 };
const ADD_ZONE_PREFIX = '__addzone__:';

function dayAddZoneItem(date: string, showEmptyLabel: boolean): FeedItem {
  return {
    id: `${ADD_ZONE_PREFIX}${date}`,
    eventId: '',
    addZone: true,
    showEmptyLabel,
  };
}

export default function TimelineScreen() {
  const { strings, locale } = useMobileLocale();
  const tl = strings.timelineScreen;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { cycle, loading } = useFarmContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<SectionList<FeedItem, FeedSection>>(null);

  const {
    sections,
    feedingByEventId,
    today,
    isLoading: feedLoading,
    isError: feedError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    ensureMonth,
    storagePathByAssetId,
    leafSkillByAssetId,
    mediaAnalysisStatusByAssetId,
    refreshFeedData,
  } = useFeedEvents();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<EventRow | null>(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [feedPinnedDate, setFeedPinnedDate] = useState<string | null>(null);
  const feedPinnedDateRef = useRef<string | null>(null);
  feedPinnedDateRef.current = feedPinnedDate;
  const userScrolledRef = useRef(false);
  const emptyDayLastTapRef = useRef(0);

  const onEmptyDayPress = useCallback(
    (date: string) => {
      if (isFutureFarmCalendarDate(date, today)) return;
      const now = Date.now();
      if (now - emptyDayLastTapRef.current < 320) {
        emptyDayLastTapRef.current = 0;
        setSelectedDate(date);
        setAddMenuOpen(true);
        return;
      }
      emptyDayLastTapRef.current = now;
    },
    [today],
  );

  useEffect(() => {
    if (selectedDate === null && today) setSelectedDate(today);
  }, [today, selectedDate]);

  const listSections: FeedSection[] = useMemo(() => {
    const built: FeedSection[] = sections.map((s) => ({
      title: s.date,
      date: s.date,
      data: [
        ...s.events.map((ev) => ({ id: ev.id, eventId: ev.id })),
        dayAddZoneItem(s.date, s.events.length === 0),
      ],
    }));
    if (selectedDate && !built.some((s) => s.date === selectedDate)) {
      built.push({
        title: selectedDate,
        date: selectedDate,
        data: [dayAddZoneItem(selectedDate, true)],
      });
      built.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    return built;
  }, [sections, selectedDate]);

  const visibleSections = useMemo(() => {
    if (!feedPinnedDate) return listSections;
    const pinned = listSections.find((s) => s.date === feedPinnedDate);
    if (pinned) return [pinned];
    return [
      {
        title: feedPinnedDate,
        date: feedPinnedDate,
        data: [dayAddZoneItem(feedPinnedDate, true)],
      },
    ];
  }, [listSections, feedPinnedDate]);

  const eventById = useMemo(() => {
    const map = new Map<string, (typeof sections)[0]['events'][0]>();
    for (const sec of sections) {
      for (const ev of sec.events) map.set(ev.id, ev);
    }
    return map;
  }, [sections]);

  const onSelectCalendarDate = useCallback(
    (date: string) => {
      userScrolledRef.current = false;
      setFeedPinnedDate(date);
      setSelectedDate(date);
      ensureMonth(date);
    },
    [ensureMonth],
  );

  useEffect(() => {
    if (selectedDate) ensureMonth(selectedDate);
  }, [selectedDate, sections, ensureMonth]);

  useEffect(() => {
    if (!feedPinnedDate || visibleSections.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: false,
        viewOffset: 0,
      });
    });
  }, [feedPinnedDate, visibleSections]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (feedPinnedDateRef.current || !userScrolledRef.current) return;
    const first = viewableItems.find((v) => v.isViewable && v.index != null && v.section);
    if (first?.section && typeof first.section === 'object' && 'date' in first.section) {
      const date = (first.section as FeedSection).date;
      setSelectedDate((prev) => (prev === date ? prev : date));
    }
  }).current;

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>{tl.loading}</Text>
      </View>
    );
  }

  if (!cycle) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>{tl.noCycle}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/cycle/new')}>
          <Text style={styles.primaryBtnText}>{strings.cycle.newCycle}</Text>
        </Pressable>
      </View>
    );
  }

  const selected = selectedDate ?? today;
  const canAddOnSelected = !isFutureFarmCalendarDate(selected, today);
  const addControl = (
    <Pressable
      onPress={() => {
        if (!canAddOnSelected) return;
        setAddMenuOpen(true);
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={tl.addA11y}
      accessibilityState={{ disabled: !canAddOnSelected }}
      style={[styles.addBtn, !canAddOnSelected && styles.addBtnDisabled]}
    >
      <SymbolView
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        tintColor={colors.primary}
        size={18}
        weight="medium"
      />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <CycleContextBar trailing={addControl} />
      <FocusedPlantBar />
      {feedLoading && sections.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>{tl.loading}</Text>
        </View>
      ) : (
      <View style={styles.feed}>
      <View style={styles.calendarWrap}>
        <CycleCalendarBlock
          selectedDate={selected}
          onSelectDate={onSelectCalendarDate}
          displayMode={calendarExpanded ? 'month' : 'week'}
          onToggleDisplayMode={() => setCalendarExpanded((v) => !v)}
        />
      </View>

      <SectionList<FeedItem, FeedSection>
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={visibleSections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        onScrollBeginDrag={() => {
          userScrolledRef.current = true;
          setFeedPinnedDate(null);
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
        renderItem={({ item, section }) => {
          if (item.addZone) {
            const emptyDay = item.showEmptyLabel;
            const futureDay = isFutureFarmCalendarDate(section.date, today);
            if (futureDay) {
              return (
                <View style={emptyDay ? styles.dayEmptyArea : styles.dayAddFooter}>
                  <View style={emptyDay ? styles.dayEmptyContent : styles.dayAddFooterContent}>
                    <Text style={styles.dayEmptyHint}>{tl.futureDayNoAdd}</Text>
                  </View>
                </View>
              );
            }
            return (
              <Pressable
                onPress={() => onEmptyDayPress(section.date)}
                style={emptyDay ? styles.dayEmptyArea : styles.dayAddFooter}
                accessibilityRole="button"
                accessibilityLabel={
                  emptyDay
                    ? `${strings.cycle.calDayEmpty} ${tl.emptyDayDoubleTapHint}`
                    : tl.emptyDayDoubleTapHint
                }
              >
                <View style={emptyDay ? styles.dayEmptyContent : styles.dayAddFooterContent}>
                  <Text style={styles.dayEmptyHint}>{tl.emptyDayDoubleTapHint}</Text>
                </View>
              </Pressable>
            );
          }
          const event = eventById.get(item.eventId);
          if (!event) return null;
          const storagePaths = resolvedEventStoragePaths(event, storagePathByAssetId);
          return (
            <FeedEventCard
              event={event}
              feedingRow={feedingByEventId.get(event.id)}
              storagePaths={storagePaths}
              onPress={() => setOpenEvent(event)}
            />
          );
        }}
      />
      </View>
      )}

      <CycleOverviewSheet visible={overviewOpen} onClose={() => setOverviewOpen(false)} />
      <EventDetailSheet
        event={openEvent}
        photoAttachments={
          openEvent ? resolvedEventPhotoAttachments(openEvent, storagePathByAssetId) : []
        }
        leafSkillByAssetId={leafSkillByAssetId}
        mediaAnalysisStatusByAssetId={mediaAnalysisStatusByAssetId}
        onLeafConfirmed={() => void refreshFeedData()}
        typeLabel={
          openEvent
            ? feedEventTypeLabel(openEvent, strings.cycle, strings.captureScreen.eventTypes)
            : ''
        }
        onClose={() => setOpenEvent(null)}
      />
      <TimelineAddMenu
        visible={addMenuOpen}
        selectedDate={selected}
        today={today}
        onClose={() => setAddMenuOpen(false)}
      />
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screen },
    feed: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.screen },
    addBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${c.primary}1F`,
    },
    addBtnDisabled: { opacity: 0.35 },
    calendarWrap: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.border },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
    sectionHeader: {
      backgroundColor: c.screen,
      paddingVertical: 8,
      paddingTop: 12,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: c.sectionLabel, textTransform: 'uppercase' },
    muted: { color: c.textMuted, textAlign: 'center', padding: 24 },
    dayEmptyArea: { minHeight: 280, flexGrow: 1 },
    dayEmptyContent: { flex: 1, justifyContent: 'center', paddingVertical: 24 },
    dayAddFooter: { flexGrow: 1, minHeight: 120, paddingTop: 12 },
    dayAddFooterContent: { paddingVertical: 16, paddingBottom: 8 },
    dayEmptyHint: { color: c.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
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
