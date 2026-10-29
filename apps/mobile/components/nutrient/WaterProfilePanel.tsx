import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { loadNutrientGuestStoreMobile, saveNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import { deleteGuestWater, upsertGuestWater } from '@growlog/web-lib/nutrient/guest/guest-workspace-actions';
import {
  createGuestId,
  deleteFarmWaterProfile,
  upsertFarmWaterProfileFull,
} from '@growlog/domain';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const IONS = [
  ['Ca', 'Ca'],
  ['Mg', 'Mg'],
  ['K', 'K'],
  ['HCO3', 'HCO₃'],
  ['SO4', 'SO₄'],
  ['N_NO3', 'N-NO₃'],
  ['Na', 'Na'],
  ['Cl', 'Cl'],
] as const;

export type WaterProfileRow = {
  id: string;
  name: string;
  water_ppm: Record<string, number>;
  alkalinity_hco3_ppm: number | null;
  ec_ms_cm?: number | null;
  ph?: number | null;
};

type WaterCopy = {
  lead: string;
  none: string;
  add: string;
  compositionHint: string;
  namePlaceholder: string;
  nameRequired: string;
  applied: string;
  allZero: string;
  edit: string;
  deleteLabel: string;
  deleteTitle: string;
  deleteBody: string;
  unit: string;
  ec: string;
  ph: string;
};

type Props = {
  profiles: WaterProfileRow[];
  activeId: string;
  onSelect: (id: string) => void;
  isCloudSynced: boolean;
  farmId: string | null;
  userId: string | null;
  supabase: Parameters<typeof upsertFarmWaterProfileFull>[0];
  reload: () => Promise<void>;
  copy: WaterCopy;
  saveLabel: string;
  cancelLabel: string;
  errorLabel: string;
};

function fieldNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function ionValue(profile: WaterProfileRow, key: (typeof IONS)[number][0]): number | null {
  if (key === 'HCO3') {
    const hco3 = profile.water_ppm.HCO3;
    if (hco3 != null) return hco3;
    return profile.alkalinity_hco3_ppm;
  }
  return profile.water_ppm[key] ?? null;
}

function analysisLine(profile: WaterProfileRow, unit: string): string | null {
  const ions = IONS.flatMap(([key, label]) => {
    const value = ionValue(profile, key);
    return value != null && value !== 0 ? [`${label} ${value}`] : [];
  });
  const meta = [
    profile.ec_ms_cm != null ? `EC ${profile.ec_ms_cm}` : '',
    profile.ph != null ? `pH ${profile.ph}` : '',
  ].filter(Boolean);
  if (ions.length === 0 && meta.length === 0) return null;
  const ionText = ions.length > 0 ? `${ions.join(' · ')} ${unit}` : '';
  return [ionText, ...meta].filter(Boolean).join(' · ');
}

export function WaterProfilePanel({
  profiles,
  activeId,
  onSelect,
  isCloudSynced,
  farmId,
  userId,
  supabase,
  reload,
  copy,
  saveLabel,
  cancelLabel,
  errorLabel,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const savingRef = useRef(false);
  const [mode, setMode] = useState<'idle' | 'create' | string>('idle');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ec, setEc] = useState('');
  const [ph, setPh] = useState('');
  const [nameMissing, setNameMissing] = useState(false);

  const editing = mode !== 'idle';
  const active = profiles.find((profile) => profile.id === activeId) ?? null;
  const activeLine = active ? analysisLine(active, copy.unit) : null;

  const openCreate = () => {
    setMode('create');
    setName('');
    setFields({});
    setEc('');
    setPh('');
    setNameMissing(false);
  };

  const openEdit = (profile: WaterProfileRow) => {
    const next: Record<string, string> = {};
    for (const [key] of IONS) {
      const value = ionValue(profile, key);
      if (value != null && value !== 0) next[key] = String(value);
    }
    setMode(profile.id);
    setName(profile.name);
    setFields(next);
    setEc(profile.ec_ms_cm == null ? '' : String(profile.ec_ms_cm));
    setPh(profile.ph == null ? '' : String(profile.ph));
    setNameMissing(false);
  };

  const closeForm = () => {
    setMode('idle');
    setNameMissing(false);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameMissing(true);
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    const waterPpm: Record<string, number> = {};
    for (const [key] of IONS) {
      const value = fieldNumber(fields[key] ?? '');
      if (value != null && value !== 0) waterPpm[key] = value;
    }
    const ecValue = fieldNumber(ec);
    const phValue = fieldNumber(ph);
    const run = async () => {
      if (isCloudSynced && farmId) {
        const row = await upsertFarmWaterProfileFull(supabase, {
          farmId,
          id: mode === 'create' ? undefined : mode,
          name: trimmed,
          waterPpm,
          alkalinityHco3Ppm: null,
          ecMsCm: ecValue,
          ph: phValue,
          userId,
        });
        await reload();
        onSelect(row.id as string);
        return;
      }
      const id = mode === 'create' ? createGuestId() : mode;
      const store = await loadNutrientGuestStoreMobile();
      const next = upsertGuestWater(store, {
        id,
        name: trimmed,
        water_ppm: waterPpm,
        alkalinity_hco3_ppm: null,
        ec_ms_cm: ecValue,
        ph: phValue,
      });
      await saveNutrientGuestStoreMobile({
        ...next,
        workspace: { ...next.workspace, activeWaterProfileId: id },
      });
      await reload();
      onSelect(id);
    };
    void run()
      .then(() => closeForm())
      .catch(() => Alert.alert(errorLabel))
      .finally(() => {
        savingRef.current = false;
      });
  };

  const confirmDelete = (profile: WaterProfileRow) => {
    Alert.alert(copy.deleteTitle, copy.deleteBody.replace('{name}', profile.name), [
      { text: cancelLabel, style: 'cancel' },
      {
        text: copy.deleteLabel,
        style: 'destructive',
        onPress: () => {
          const run = async () => {
            if (isCloudSynced && farmId) {
              await deleteFarmWaterProfile(supabase, farmId, profile.id);
            } else {
              const store = await loadNutrientGuestStoreMobile();
              await saveNutrientGuestStoreMobile(deleteGuestWater(store, profile.id));
            }
            if (activeId === profile.id) onSelect('');
            if (mode === profile.id) closeForm();
            await reload();
          };
          void run().catch(() => Alert.alert(errorLabel));
        },
      },
    ]);
  };

  return (
    <View style={styles.stack}>
      <Text style={styles.lead}>{copy.lead}</Text>
      <View style={styles.card}>
        <Pressable style={styles.listRow} onPress={() => onSelect('')}>
          <Radio selected={!activeId} />
          <Text style={styles.listLabel}>{copy.none}</Text>
        </Pressable>
        {profiles.map((profile) => {
          const selected = profile.id === activeId;
          return (
            <View key={profile.id}>
              <Pressable style={styles.listRow} onPress={() => onSelect(profile.id)}>
                <Radio selected={selected} />
                <Text style={styles.listLabel} numberOfLines={1}>{profile.name}</Text>
              </Pressable>
              {selected && mode !== profile.id ? (
                <View style={styles.detail}>
                  <Text style={styles.detailText}>{activeLine ?? copy.allZero}</Text>
                  <Text style={styles.detailHint}>{copy.applied}</Text>
                  <View style={styles.detailActions}>
                    <Pressable onPress={() => openEdit(profile)} accessibilityRole="button">
                      <Text style={styles.link}>{copy.edit}</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(profile)} accessibilityRole="button">
                      <Text style={styles.link}>{copy.deleteLabel}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        {editing ? (
          <View style={styles.form}>
            <Text style={styles.hint}>{copy.compositionHint}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (value.trim()) setNameMissing(false);
              }}
              placeholder={copy.namePlaceholder}
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={colors.keyboardAppearance}
            />
            <View style={styles.ionGrid}>
              {IONS.map(([key, label]) => (
                <View key={key} style={styles.ionCell}>
                  <Text style={styles.ionLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={fields[key] ?? ''}
                    onChangeText={(value) => setFields((prev) => ({ ...prev, [key]: value }))}
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                    keyboardAppearance={colors.keyboardAppearance}
                    accessibilityLabel={label}
                  />
                </View>
              ))}
            </View>
            <View style={styles.ionGrid}>
              <View style={styles.ionCell}>
                <Text style={styles.ionLabel}>{copy.ec}</Text>
                <TextInput
                  style={styles.input}
                  value={ec}
                  onChangeText={setEc}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  keyboardAppearance={colors.keyboardAppearance}
                  accessibilityLabel={copy.ec}
                />
              </View>
              <View style={styles.ionCell}>
                <Text style={styles.ionLabel}>{copy.ph}</Text>
                <TextInput
                  style={styles.input}
                  value={ph}
                  onChangeText={setPh}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  keyboardAppearance={colors.keyboardAppearance}
                  accessibilityLabel={copy.ph}
                />
              </View>
            </View>
            {nameMissing ? <Text style={styles.error}>{copy.nameRequired}</Text> : null}
            <Pressable style={styles.btn} accessibilityRole="button" onPress={save}>
              <Text style={styles.btnText}>{saveLabel}</Text>
            </Pressable>
            <Pressable style={styles.btnOutline} accessibilityRole="button" onPress={closeForm}>
              <Text style={styles.btnOutlineText}>{cancelLabel}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.btn} accessibilityRole="button" onPress={openCreate}>
            <Text style={styles.btnText}>{copy.add}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Radio({ selected }: { selected: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.radio, selected && styles.radioOn]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    stack: { gap: 8 },
    lead: { fontSize: 15, lineHeight: 21, color: c.textMuted },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
    },
    listRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    listLabel: { flex: 1, fontSize: 16, color: c.text },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: c.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
    detail: { paddingLeft: 32, paddingBottom: 8, gap: 4 },
    detailText: { fontSize: 14, lineHeight: 20, color: c.text },
    detailHint: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    detailActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
    link: { fontSize: 14, fontWeight: '600', color: c.primary },
    form: { gap: 8, marginTop: 4 },
    hint: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
    },
    ionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ionCell: { width: '47%', gap: 4 },
    ionLabel: { fontSize: 13, fontWeight: '600', color: c.text },
    error: { fontSize: 14, lineHeight: 20, color: c.dangerText },
    btn: { backgroundColor: c.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
    btnOutline: { borderWidth: 1, borderColor: c.border, padding: 10, borderRadius: 8, alignItems: 'center' },
    btnOutlineText: { color: c.text },
    btnText: { color: c.primaryText, fontWeight: '600' },
  });
}
