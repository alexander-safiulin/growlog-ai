import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  createGrowCycleTracking,
  farmCalendarDateString,
  fetchFarmZones,
  growerNumberFieldErrorRu,
  initialStageForMaterial,
  mapGrowCycleRpcError,
  parseGrowerNumber,
  validatePhotoperiodHours,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type LightPreset = '18/6' | '12/12' | 'custom';

export function CycleNewForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { strings } = useMobileLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, farms, refetchAll } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [material, setMaterial] = useState<'seed' | 'clone'>('seed');
  const [startDate, setStartDate] = useState(() => farmCalendarDateString(farmTz));
  const [preset, setPreset] = useState<LightPreset>('18/6');
  const [lightOn, setLightOn] = useState('18');
  const [lightOff, setLightOff] = useState('6');
  const [lightsOnAt, setLightsOnAt] = useState('06:00');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const zonesQuery = useQuery({
    queryKey: ['farm-zones', farmId],
    enabled: !!farmId,
    queryFn: () => fetchFarmZones(supabase, farmId!),
  });

  const effectiveLight = useMemo(() => {
    if (preset === '18/6') return { on: 18, off: 6 };
    if (preset === '12/12') return { on: 12, off: 12 };
    const on = parseInt(lightOn, 10);
    const off = parseInt(lightOff, 10);
    return { on: Number.isFinite(on) ? on : 18, off: Number.isFinite(off) ? off : 6 };
  }, [preset, lightOn, lightOff]);

  async function submit() {
    if (!farmId) return;
    setFieldError(null);
    setError(null);
    if (plantCount.trim()) {
      const pc = parseGrowerNumber(plantCount, { integer: true });
      if (!pc.ok) {
        setFieldError(growerNumberFieldErrorRu(pc.error, copy.formPlantCount));
        return;
      }
    }
    if (!validatePhotoperiodHours(effectiveLight.on, effectiveLight.off)) {
      setFieldError(copy.invalidPhotoperiod);
      return;
    }
    setPending(true);
    try {
      const pc = plantCount.trim() ? parseGrowerNumber(plantCount, { integer: true }) : null;
      await createGrowCycleTracking(supabase, {
        farmId,
        name: name.trim() || copy.formTitleNew,
        cultivarName: strain.trim() || undefined,
        startDate,
        stage: initialStageForMaterial(material),
        zoneId: zoneId || null,
        plantCount: pc?.ok ? pc.value : null,
        startMaterial: material,
        lightHoursOn: effectiveLight.on,
        lightHoursOff: effectiveLight.off,
        lightsOnAt,
      });
      refetchAll();
      onSubmitted?.();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : strings.manualReading.saveFailed));
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>{copy.formName}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.formStrain}</Text>
      <TextInput
        style={styles.input}
        value={strain}
        onChangeText={setStrain}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.formPlantCount}</Text>
      <TextInput
        style={styles.input}
        value={plantCount}
        onChangeText={setPlantCount}
        keyboardType="numeric"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.formZone}</Text>
      <View style={styles.select}>
        <Button title={zoneId ? zonesQuery.data?.find((z) => z.id === zoneId)?.name ?? copy.formZoneNone : copy.formZoneNone} onPress={() => setZoneId('')} />
        {(zonesQuery.data ?? []).map((z) => (
          <Button key={z.id} title={z.name} onPress={() => setZoneId(z.id)} color={zoneId === z.id ? colors.primary : undefined} />
        ))}
      </View>
      <Text style={styles.label}>{copy.formStartMaterial}</Text>
      <View style={styles.row}>
        {(['seed', 'clone'] as const).map((m) => (
          <Button
            key={m}
            title={m === 'seed' ? copy.materialSeed : copy.materialClone}
            onPress={() => setMaterial(m)}
            color={material === m ? colors.primary : colors.textMuted}
          />
        ))}
      </View>
      <Text style={styles.label}>{copy.formStartDate}</Text>
      <TextInput
        style={styles.input}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.formLightPreset}</Text>
      <View style={styles.row}>
        <Button title={copy.preset186} onPress={() => setPreset('18/6')} color={preset === '18/6' ? colors.primary : undefined} />
        <Button title={copy.preset1212} onPress={() => setPreset('12/12')} color={preset === '12/12' ? colors.primary : undefined} />
        <Button title={copy.presetCustom} onPress={() => setPreset('custom')} color={preset === 'custom' ? colors.primary : undefined} />
      </View>
      {preset === 'custom' ? (
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            value={lightOn}
            onChangeText={setLightOn}
            keyboardType="numeric"
            placeholder={copy.formLightOn}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
          <TextInput
            style={[styles.input, styles.half]}
            value={lightOff}
            onChangeText={setLightOff}
            keyboardType="numeric"
            placeholder={copy.formLightOff}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
        </View>
      ) : null}
      <Text style={styles.label}>{copy.formLightsOnAt}</Text>
      <TextInput
        style={styles.input}
        value={lightsOnAt}
        onChangeText={setLightsOnAt}
        placeholder="06:00"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={copy.formSubmit} onPress={submit} disabled={pending} />
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, gap: 10, backgroundColor: c.screen },
    label: { fontSize: 14, fontWeight: '600', color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    half: { flex: 1 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    select: { gap: 4 },
    error: { color: c.dangerText, fontSize: 13 },
  });
}
