import { useMobileLocale } from '@/context/LocaleContext';
import { semverGreaterThan } from '@growlog/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type VersionPayload = {
  version: string;
  installUrl: string;
};

const SITE_ORIGIN = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://growlog.ai';
const DISMISS_KEY = 'growlog_mobile_update_banner_dismissed';

export function MobileAppUpdateBanner() {
  const { strings } = useMobileLocale();
  const [payload, setPayload] = useState<VersionPayload | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const current = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    fetch(`${SITE_ORIGIN}/mobile-app-version.json`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: VersionPayload) => setPayload(data))
      .catch(() => undefined);
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => {
        if (v === current) setDismissed(true);
      })
      .catch(() => undefined);
  }, [current]);

  const newer = payload ? semverGreaterThan(payload.version, current) : false;
  if (!payload || !newer || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISS_KEY, payload.version).catch(() => undefined);
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{strings.nutrient.updateBanner?.message ?? 'Update available'}</Text>
      <View style={styles.actions}>
        <Pressable onPress={() => Linking.openURL(payload.installUrl).catch(() => undefined)}>
          <Text style={styles.link}>{strings.nutrient.updateBanner?.install ?? 'Install'}</Text>
        </Pressable>
        <Pressable onPress={dismiss}>
          <Text style={styles.dismiss}>{strings.nutrient.updateBanner?.dismiss ?? 'Dismiss'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: '#3d7a4a44',
    backgroundColor: '#3d7a4a14',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  text: { fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  link: { fontSize: 13, fontWeight: '600', color: '#2f6b3c' },
  dismiss: { fontSize: 13, color: '#5c5c5c' },
});
