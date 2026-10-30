import { PlantQrPreview } from '@/components/cycle/PlantQrPreview';
import { CycleFormCaption, CycleFormLabel } from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { ScrollView, StyleSheet, View } from 'react-native';

export function VarietyPlantLabelsSection({
  cultivarName,
  plantIds,
}: {
  cultivarName: string;
  plantIds: string[];
}) {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { farmId, isLocalWorkspace } = useFarmContext();

  if (!plantIds.length) return null;
  if (!farmId || isLocalWorkspace) {
    return (
      <View style={styles.wrap}>
        <CycleFormLabel>{copy.formVarietyQrTitle}</CycleFormLabel>
        <CycleFormCaption>{copy.formVarietyQrNeedCloud}</CycleFormCaption>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CycleFormLabel>{copy.formVarietyQrTitle}</CycleFormLabel>
      <CycleFormCaption>{copy.formVarietyQrHint}</CycleFormCaption>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {plantIds.map((plantId, index) => (
          <PlantQrPreview
            key={plantId}
            farmId={farmId}
            plantId={plantId}
            cultivarName={cultivarName.trim()}
            labelNumber={String(index + 1)}
            compact
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 4 },
  row: { gap: 10, paddingVertical: 4 },
});
