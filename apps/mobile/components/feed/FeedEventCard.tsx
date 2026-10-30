import { EventMediaThumb } from '@/components/feed/EventMediaThumb';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  formatRuDecimal,
  growerStageLabelRu,
  type EventRow,
  type RawFeedingRow,
} from '@growlog/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const CAPTURE_EVENT_TYPES = [
  'note',
  'observation',
  'action_taken',
  'watering',
  'feeding',
  'issue_detected',
] as const;

export function feedEventTypeLabel(
  event: EventRow,
  copy: { procedureFeedLabel: string },
  captureTypes: Readonly<Record<(typeof CAPTURE_EVENT_TYPES)[number], string>>,
): string {
  if (event.event_type === 'action_taken' && event.payload?.procedure === true) {
    return copy.procedureFeedLabel;
  }
  if (event.event_type === 'stage_changed') {
    return growerStageLabelRu(String(event.payload?.to_stage ?? ''));
  }
  if (CAPTURE_EVENT_TYPES.includes(event.event_type as (typeof CAPTURE_EVENT_TYPES)[number])) {
    return captureTypes[event.event_type as (typeof CAPTURE_EVENT_TYPES)[number]];
  }
  return event.event_type.replace(/_/g, ' ');
}

export function FeedEventCard({
  event,
  feedingRow,
  storagePaths = [],
  onPress,
}: {
  event: EventRow;
  feedingRow?: RawFeedingRow;
  storagePaths?: string[];
  onPress?: () => void;
}) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const typeLabel = feedEventTypeLabel(event, copy, strings.captureScreen.eventTypes);

  const time = new Date(event.occurred_at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const storagePath =
    storagePaths[0] ??
    (typeof event.payload?.storage_path === 'string' ? event.payload.storage_path : null);

  const card = (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.type}>{typeLabel}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      {event.title ? <Text style={styles.title}>{event.title}</Text> : null}
      {event.body ? <Text style={styles.body}>{event.body}</Text> : null}
      {storagePath ? <EventMediaThumb storagePath={storagePath} /> : null}
      {feedingRow ? (
        <View style={styles.feedBlock}>
          <Text style={styles.line}>
            {copy.logVolume}: {formatRuDecimal(feedingRow.volume_ml, 0)} мл
          </Text>
          {feedingRow.ph != null ? (
            <Text style={styles.line}>
              {copy.logPh}: {formatRuDecimal(feedingRow.ph, 1)}
            </Text>
          ) : null}
          {feedingRow.recipe_name ? (
            <Text style={styles.line}>
              {copy.logRecipe}: {feedingRow.recipe_name}
            </Text>
          ) : null}
          {feedingRow.doses.map((d, i) => (
            <Text key={i} style={styles.muted}>
              {d.product_label}: {formatRuDecimal(d.amount_ml, 1)} мл
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.timelineScreen.openEventA11y}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {card}
    </Pressable>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    pressed: { opacity: 0.75 },
    card: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 8,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
    type: { fontSize: 12, fontWeight: '700', color: c.primary, textTransform: 'uppercase', flex: 1 },
    time: { fontSize: 12, color: c.textMuted },
    title: { fontSize: 15, fontWeight: '600', color: c.text, marginTop: 4 },
    body: { fontSize: 14, color: c.text, marginTop: 4, lineHeight: 20 },
    feedBlock: { marginTop: 6, gap: 2 },
    line: { fontSize: 13, color: c.text },
    muted: { fontSize: 12, color: c.textMuted },
  });
}
