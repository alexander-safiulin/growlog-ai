import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  forwardStagesFrom,
  growerStageLabelRu,
  mapGrowCycleRpcError,
  stagesForStartMaterial,
  transitionGrowCycleStage,
  type GrowCycleStage,
} from '@growlog/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function CycleStageActionsBlock() {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { supabase, farmId, cycle, scopeId, refetchAll } = useFarmContext();
  const [fixOpen, setFixOpen] = useState(false);
  const [fixStage, setFixStage] = useState<GrowCycleStage | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!cycle || !farmId || !scopeId) return null;

  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const forward = forwardStagesFrom(cycle.stage as GrowCycleStage, material);
  const stageOptions = stagesForStartMaterial(material);

  function stageLabel(s: GrowCycleStage) {
    return copy.stageAdvance[s];
  }

  async function go(stage: GrowCycleStage, allowBackward = false) {
    setError(null);
    setPending(true);
    try {
      await transitionGrowCycleStage(supabase, {
        farmId: farmId!,
        cycleId: cycle!.id,
        scopeId: scopeId!,
        newStage: stage,
        allowBackward,
      });
      refetchAll();
      setFixOpen(false);
      setFixStage('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : strings.manualReading.saveFailed;
      setError(mapGrowCycleRpcError(msg));
    } finally {
      setPending(false);
    }
  }

  if (!forward.length && cycle.stage === 'completed') return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{copy.stageActionsTitle}</Text>
      <View style={styles.row}>
        {forward.map((s) => (
          <Pressable
            key={s}
            disabled={pending}
            style={[styles.btn, pending && styles.btnDisabled]}
            onPress={() => void go(s)}
          >
            <Text style={styles.btnText}>{stageLabel(s)}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={styles.outlineBtn}
        onPress={() => setFixOpen((v) => !v)}
        disabled={pending}
      >
        <Text style={styles.outlineText}>{copy.fixStage}</Text>
      </Pressable>
      {fixOpen ? (
        <View style={styles.fixRow}>
          {stageOptions.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, fixStage === s && styles.chipActive]}
              onPress={() => setFixStage(s)}
            >
              <Text style={[styles.chipText, fixStage === s && styles.chipTextActive]}>
                {growerStageLabelRu(s)}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.btn, (!fixStage || pending) && styles.btnDisabled]}
            disabled={!fixStage || pending}
            onPress={() => fixStage && void go(fixStage, true)}
          >
            <Text style={styles.btnText}>{copy.fixStageApply}</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 4 },
  title: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 13, fontWeight: '500', color: '#1b4332' },
  outlineBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  outlineText: { fontSize: 13, color: '#444' },
  fixRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f0f0f0',
  },
  chipActive: { backgroundColor: '#2d6a4f' },
  chipText: { fontSize: 12, color: '#333' },
  chipTextActive: { color: '#fff' },
  error: { fontSize: 13, color: '#b00020' },
});
