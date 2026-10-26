import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  fetchFarmTuyaDeviceRows,
  fetchFarmTuyaLinkRows,
  type FarmTuyaDeviceRow,
  type FarmTuyaLinkRow,
} from '@growlog/domain';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

function makeStyles(colors: MobileThemeColors) {
  return {
    section: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: colors.sectionLabel,
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'uppercase' as const,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    body: { fontSize: 15, color: colors.text, marginBottom: 6 },
    muted: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
    mono: { fontFamily: 'monospace', fontSize: 12, color: colors.text },
    subhead: { fontSize: 14, fontWeight: '600' as const, color: colors.text, marginTop: 8, marginBottom: 4 },
  };
}

export function TuyaFarmLinksSection() {
  const { strings } = useMobileLocale();
  const copy = strings.settingsScreen.tuyaLinks;
  const cm = strings.commonMobile;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { supabase, farmId, userId, isLocalWorkspace } = useFarmContext();
  const [links, setLinks] = useState<FarmTuyaLinkRow[]>([]);
  const [devices, setDevices] = useState<FarmTuyaDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!farmId || !userId || isLocalWorkspace) {
      setLinks([]);
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [linkRows, deviceRows] = await Promise.all([
        fetchFarmTuyaLinkRows(supabase, farmId),
        fetchFarmTuyaDeviceRows(supabase, farmId),
      ]);
      setLinks(linkRows);
      setDevices(deviceRows);
    } finally {
      setLoading(false);
    }
  }, [farmId, userId, isLocalWorkspace, supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!farmId || !userId || isLocalWorkspace) return null;

  return (
    <>
      <Text style={styles.section}>{copy.title}</Text>
      <View style={styles.card}>
        <Text style={styles.body}>{copy.desc}</Text>
        <Text style={styles.muted}>{copy.managedByGrowlog}</Text>
        {loading ? <Text style={styles.muted}>{cm.loading}</Text> : null}
        {!loading && links.length === 0 && devices.length === 0 ? (
          <Text style={styles.muted}>{copy.empty}</Text>
        ) : null}
        {links.length > 0 ? (
          <>
            <Text style={styles.subhead}>{copy.accounts}</Text>
            {links.map((link) => (
              <View key={link.id} style={{ marginBottom: 8 }}>
                <Text style={styles.mono}>{link.tuya_uid}</Text>
              </View>
            ))}
          </>
        ) : null}
        {devices.length > 0 ? (
          <>
            <Text style={styles.subhead}>{copy.devices}</Text>
            {devices.map((device) => (
              <View key={device.id} style={{ marginBottom: 8 }}>
                <Text style={styles.mono}>{device.tuya_device_id}</Text>
                <Text style={styles.muted}>{device.tuya_uid}</Text>
              </View>
            ))}
          </>
        ) : null}
      </View>
    </>
  );
}
