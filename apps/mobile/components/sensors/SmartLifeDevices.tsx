import { CloudFeatureGate } from '@/components/auth/CloudFeatureGate';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { listSmartLifeClimate, type SmartLifeDevice } from '@growlog/api-client';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ListError = Error & { code?: string };

export function SmartLifeDevices() {
  const { strings } = useMobileLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.smartLife;
  const { supabase, farmId, isLocalWorkspace } = useFarmContext();
  const query = useQuery({
    queryKey: ['smartlife-devices', farmId],
    enabled: Boolean(farmId),
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !farmId) throw new Error('unauthorized');
      return listSmartLifeClimate(token, farmId);
    },
  });

  if (isLocalWorkspace) {
    return (
      <CloudFeatureGate reason="sensors">
        <View />
      </CloudFeatureGate>
    );
  }

  if (!farmId) return null;

  const errorCode = (query.error as ListError | null)?.code;
  const devices: SmartLifeDevice[] = query.data?.devices ?? [];
  const hasTuyaLinks = query.data?.hasTuyaLinks !== false;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>
        <Pressable onPress={() => void query.refetch()} disabled={query.isFetching}>
          <Text style={styles.refresh}>{copy.refresh}</Text>
        </Pressable>
      </View>
      <Text style={styles.desc}>{copy.desc}</Text>

      {query.isLoading ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
      {query.isError && errorCode === 'tuya_unconfigured' ? (
        <Text style={styles.muted}>{copy.unconfigured}</Text>
      ) : null}
      {query.isError && errorCode !== 'tuya_unconfigured' ? (
        <Text style={styles.error}>
          {copy.error}
          {query.error instanceof Error && query.error.message ? ` ${query.error.message}` : ''}
        </Text>
      ) : null}
      {!query.isLoading && !query.isError && devices.length === 0 ? (
        <Text style={styles.muted}>{hasTuyaLinks ? copy.empty : copy.noLinks}</Text>
      ) : null}

      {devices.map((device) => (
        <View key={device.id} style={styles.device}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.badge}>
              {device.online ? copy.online : copy.offline}
              {device.sub ? ` · ${copy.sub}` : ''}
            </Text>
          </View>
          <Text style={styles.meta}>
            {[device.productName, device.category].filter(Boolean).join(' · ') || device.id}
          </Text>
          {device.status.length > 0 ? (
            <Text style={styles.status}>
              {device.status.map((point) => `${point.code}: ${String(point.value)}`).join(' · ')}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 16,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    title: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    refresh: { fontSize: 14, fontWeight: '600', color: c.primary },
    desc: { fontSize: 13, color: c.textMuted, marginTop: 4, marginBottom: 12, lineHeight: 18 },
    spinner: { marginVertical: 8 },
    muted: { color: c.textMuted, fontSize: 14 },
    error: { color: c.dangerText, fontSize: 14 },
    device: { paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: c.border },
    deviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    deviceName: { flex: 1, fontSize: 16, fontWeight: '600', color: c.text },
    badge: { fontSize: 12, color: c.sectionLabel },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    status: { fontSize: 13, color: c.text, marginTop: 6, lineHeight: 18 },
  });
}
