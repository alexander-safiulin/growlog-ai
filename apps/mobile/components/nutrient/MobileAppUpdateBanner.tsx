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
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const current = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => setDismissedVersion(v))
      .catch(() => undefined);
    fetch(`${SITE_ORIGIN}/mobile-app-version.json`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: VersionPayload) => setPayload(data))
      .catch(() => undefined);
  }, []);

  const newer = payload ? semverGreaterThan(payload.version, current) : false;
  const dismissed = payload ? dismissedVersion === payload.version : false;
  if (!payload || !newer || dismissed) return null;

  const dismiss = () => {
    setDismissedVersion(payload.version);
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
