import {
  CycleFormCard,
  CycleFormPrimaryButton,
  CycleFormScreen,
  CycleFormSecondaryButton,
  CycleFormMuted,
} from '@/components/cycle/cycle-form-ui';
import { PlantQrPreview } from '@/components/cycle/PlantQrPreview';
import { useMobileLocale } from '@/context/LocaleContext';
import { printPlantLabels, sharePlantLabelsPdf, type PlantLabelRow } from '@/lib/print-plant-labels';
import { useFarmContext } from '@/providers/FarmProvider';
import { fetchPlantsForCycle, plantLabelNumber } from '@growlog/domain';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function CyclePlantLabelsScreen() {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { cycleId: cycleIdParam } = useLocalSearchParams<{ cycleId?: string }>();
  const cycleId = typeof cycleIdParam === 'string' ? cycleIdParam : null;
  const { supabase, farmId, cycle, isLocalWorkspace } = useFarmContext();
  const [pending, setPending] = useState<'print' | 'share' | null>(null);

  const plantsQuery = useQuery({
    queryKey: ['cycle-plants', farmId, cycleId],
    enabled: !!farmId && !!cycleId && !isLocalWorkspace,
    queryFn: () => fetchPlantsForCycle(supabase, { farmId: farmId!, cycleId: cycleId! }),
  });

  const rows: PlantLabelRow[] = useMemo(() => {
    if (!farmId) return [];
    return (plantsQuery.data ?? []).map((plant) => ({
      farmId,
      plantId: plant.id,
      cultivarName: plant.cultivar_name ?? copy.formStrain,
      labelNumber: plantLabelNumber(plant),
      cycleName: cycle?.name,
    }));
  }, [copy.formStrain, cycle?.name, farmId, plantsQuery.data]);

  async function onPrint() {
    setPending('print');
    try {
      await printPlantLabels(rows);
    } finally {
      setPending(null);
    }
  }

  async function onSharePdf() {
    setPending('share');
    try {
      await sharePlantLabelsPdf(rows);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: copy.plantLabelsTitle }} />
      <CycleFormScreen>
        {isLocalWorkspace ? <CycleFormMuted>{copy.formVarietyQrNeedCloud}</CycleFormMuted> : null}
        {plantsQuery.isLoading ? <CycleFormMuted>{copy.plantLabelsLoading}</CycleFormMuted> : null}
        {!plantsQuery.isLoading && !rows.length ? (
          <CycleFormMuted>{copy.plantLabelsEmpty}</CycleFormMuted>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {rows.map((row) => (
                <PlantQrPreview
                  key={row.plantId}
                  farmId={row.farmId}
                  plantId={row.plantId}
                  cultivarName={row.cultivarName}
                  labelNumber={row.labelNumber}
                />
              ))}
            </ScrollView>
            <CycleFormCard>
              <CycleFormPrimaryButton
                label={copy.plantLabelsPrint}
                onPress={onPrint}
                pending={pending === 'print'}
                disabled={!!pending || !rows.length}
              />
              <View style={styles.gap} />
              <CycleFormSecondaryButton
                label={copy.plantLabelsSharePdf}
                onPress={onSharePdf}
                disabled={!!pending || !rows.length}
              />
            </CycleFormCard>
          </>
        )}
      </CycleFormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingBottom: 8 },
  gap: { height: 10 },
});
