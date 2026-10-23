import { useMobileLocale } from '@/context/LocaleContext';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type VersionPayload = {
  version: string;
  installUrl: string;
};

const SITE_ORIGIN = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://growlog.ai';

export function MobileAppUpdateBanner() {
  const { strings } = useMobileLocale();
  const [payload, setPayload] = useState<VersionPayload | null>(null);
  const current = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    fetch(`${SITE_ORIGIN}/mobile-app-version.json`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: VersionPayload) => setPayload(data))
      .catch(() => undefined);
  }, []);

  if (!payload || payload.version === current) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{strings.nutrient.updateBanner?.message ?? 'Update available'}</Text>
      <Pressable
        onPress={() => {
          Linking.openURL(payload.installUrl).catch(() => undefined);
        }}
      >
        <Text style={styles.link}>{strings.nutrient.updateBanner?.install ?? 'Install'}</Text>
      </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  text: { flex: 1, fontSize: 13 },
  link: { fontSize: 13, fontWeight: '600', color: '#2f6b3c' },
});
