import { useTheme } from '@/context/ThemeContext';
import type { CycleDayMarker } from '@growlog/domain';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

const MARKER_SIZE = 11;

export function CalendarDayMarkers({ markers }: { markers: CycleDayMarker }) {
  const { colors } = useTheme();
  const feedingColors = markers.feedingColors ?? [];

  return (
    <View style={styles.row}>
      {markers.watering ? (
        <SymbolView
          name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }}
          tintColor="#0284c7"
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {feedingColors.map((c, i) => (
        <SymbolView
          key={`feed-${i}`}
          name={{ ios: 'flask.fill', android: 'science', web: 'science' }}
          tintColor={c}
          size={MARKER_SIZE}
          weight="medium"
        />
      ))}
      {markers.stageChange ? (
        <SymbolView
          name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
          tintColor="#b45309"
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {markers.procedure ? (
        <SymbolView
          name={{ ios: 'scissors', android: 'content_cut', web: 'content_cut' }}
          tintColor={colors.primary}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {markers.note ? (
        <SymbolView
          name={{ ios: 'doc.text', android: 'description', web: 'description' }}
          tintColor={colors.textMuted}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {markers.photo ? (
        <SymbolView
          name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
          tintColor={colors.textMuted}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 1,
    marginTop: 1,
  },
});
