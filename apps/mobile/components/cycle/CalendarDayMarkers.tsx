import { useTheme } from '@/context/ThemeContext';
import { stageAdvanceSymbol } from '@/lib/stage-advance-symbol';
import type { CycleDayMarker } from '@growlog/domain';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

const MARKER_SIZE = 11;

export function CalendarDayMarkers({ markers }: { markers: CycleDayMarker }) {
  const { colors } = useTheme();
  const icon = colors.textMuted;
  const hasFeeding = (markers.feedingColors?.length ?? 0) > 0;

  return (
    <View style={styles.row}>
      {markers.watering ? (
        <SymbolView
          name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }}
          tintColor={icon}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {hasFeeding ? (
        <SymbolView
          name={{ ios: 'flask.fill', android: 'science', web: 'science' }}
          tintColor={icon}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {markers.stageChange ? (
        <SymbolView
          name={
            markers.stageChangeTo
              ? stageAdvanceSymbol(markers.stageChangeTo)
              : { ios: 'leaf.fill', android: 'eco', web: 'eco' }
          }
          tintColor={icon}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {markers.procedure ? (
        <SymbolView
          name={{ ios: 'scissors', android: 'content_cut', web: 'content_cut' }}
          tintColor={icon}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {markers.note ? (
        <SymbolView
          name={{ ios: 'doc.text', android: 'description', web: 'description' }}
          tintColor={icon}
          size={MARKER_SIZE}
          weight="medium"
        />
      ) : null}
      {markers.photo ? (
        <SymbolView
          name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
          tintColor={icon}
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
