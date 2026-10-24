import { useMobileLocale } from '@/context/LocaleContext';
import {
  farmDateFromIso,
  formatGrowerCalendarDate,
  formatRuDecimal,
  growerStageLabelRu,
  type RawCalendarEvent,
  type RawFeedingRow,
} from '@growlog/domain';
import { StyleSheet, Text, View } from 'react-native';

export function CycleDayDetailBlock({
  date,
  timeZone,
  locale,
  events,
  feedingRows,
}: {
  date: string;
  timeZone: string;
  locale: string;
  events: RawCalendarEvent[];
  feedingRows: RawFeedingRow[];
}) {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const dateLabel = formatGrowerCalendarDate(date, locale, { includeYear: true });

  const dayFeeding = feedingRows.filter((r) => farmDateFromIso(r.occurred_at, timeZone) === date);
  const dayEvents = events.filter((e) => farmDateFromIso(e.occurred_at, timeZone) === date);
  const stageEvents = dayEvents.filter((e) => e.event_type === 'stage_changed');
  const miscEvents = dayEvents.filter(
    (e) => !['watering', 'feeding', 'stage_changed'].includes(e.event_type),
  );

  if (dayFeeding.length === 0 && dayEvents.length === 0) {
    return <Text style={styles.muted}>{copy.calDayEmpty}</Text>;
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{copy.calDayTitle.replace('{date}', dateLabel)}</Text>
      {dayFeeding.map((row) => (
        <View key={row.event_id} style={styles.entry}>
          <Text style={styles.entryTitle}>
            {row.entry_kind === 'feeding' ? copy.logTitleFeed : copy.logTitleWater}
          </Text>
          <Text style={styles.line}>
            {copy.logVolume}: {formatRuDecimal(row.volume_ml, 0)} мл
          </Text>
          {row.ph != null ? <Text style={styles.line}>{copy.logPh}: {formatRuDecimal(row.ph, 1)}</Text> : null}
          {row.recipe_name ? <Text style={styles.line}>{copy.logRecipe}: {row.recipe_name}</Text> : null}
          {row.doses.map((d, i) => (
            <Text key={i} style={styles.muted}>
              {d.product_label}: {formatRuDecimal(d.amount_ml, 1)} мл
            </Text>
          ))}
          {row.comment ? <Text style={styles.line}>{row.comment}</Text> : null}
        </View>
      ))}
      {stageEvents.map((ev) => (
        <Text key={ev.id} style={styles.line}>
          {growerStageLabelRu(String(ev.payload?.to_stage ?? ''))}
        </Text>
      ))}
      {miscEvents.map((ev) => (
        <Text key={ev.id} style={styles.line}>{ev.body ?? ev.event_type}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, padding: 12, borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10 },
  title: { fontWeight: '600', fontSize: 15 },
  entry: { gap: 2, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  entryTitle: { fontWeight: '500' },
  line: { fontSize: 14 },
  muted: { fontSize: 12, color: '#666' },
});
