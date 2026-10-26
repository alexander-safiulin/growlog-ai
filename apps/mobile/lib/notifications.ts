import { registerPushToken } from '@growlog/api-client';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import type { SupabaseClient } from '@supabase/supabase-js';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function permissionsGranted(
  settings: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>
): boolean {
  const s = settings as { granted?: boolean; ios?: { status: Notifications.IosAuthorizationStatus } };
  if (s.granted) return true;
  return (
    s.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function expoProjectPushToken(): Promise<string | null> {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  return token.data ?? null;
}

async function persistPushToken(supabase: SupabaseClient, expoPushToken: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return;
  await registerPushToken(accessToken, {
    expoPushToken,
    platform: Platform.OS,
  });
}

export async function registerForPushNotifications(
  supabase?: SupabaseClient
): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let allowed = permissionsGranted(existing);
  if (!allowed) {
    const result = await Notifications.requestPermissionsAsync();
    allowed = permissionsGranted(result);
  }
  if (!allowed) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sop', {
      name: 'SOP reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const expoPushToken = await expoProjectPushToken();

  if (supabase && expoPushToken) {
    await persistPushToken(supabase, expoPushToken).catch(() => undefined);
  }

  return expoPushToken;
}

export async function getPushNotificationsEnabled(supabase: SupabaseClient): Promise<{
  available: boolean;
  enabled: boolean;
}> {
  if (!Device.isDevice) {
    return { available: false, enabled: false };
  }
  const perm = await Notifications.getPermissionsAsync();
  if (!permissionsGranted(perm)) {
    return { available: true, enabled: false };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { available: true, enabled: false };
  }
  const { data, error } = await supabase
    .from('mobile_push_tokens')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  if (error) {
    return { available: true, enabled: false };
  }
  return { available: true, enabled: (data?.length ?? 0) > 0 };
}

export async function unregisterPushNotifications(supabase: SupabaseClient): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  let expoPushToken: string | null = null;
  if (Device.isDevice) {
    const perm = await Notifications.getPermissionsAsync();
    if (permissionsGranted(perm)) {
      try {
        expoPushToken = await expoProjectPushToken();
      } catch {
        expoPushToken = null;
      }
    }
  }

  if (expoPushToken) {
    await supabase
      .from('mobile_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('expo_push_token', expoPushToken);
    return;
  }

  await supabase.from('mobile_push_tokens').delete().eq('user_id', userId);
}

export function handleNotificationDeepLink(data: Record<string, unknown> | undefined) {
  if (!data) return;
  const type = data.type;
  if (type === 'sop_due' || type === 'sop_overdue') {
    const sopRunId = data.sopRunId;
    if (typeof sopRunId === 'string') {
      router.push(`/sop/run/${sopRunId}`);
    }
    return;
  }
  if (type === 'anomaly') {
    router.push('/(tabs)');
  }
}

export function attachNotificationListeners() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationDeepLink(
      response.notification.request.content.data as Record<string, unknown>
    );
  });
  return () => sub.remove();
}

/** Local demo notification for SOP testing without backend push infra. */
export async function scheduleLocalSopReminder(params: {
  sopRunId: string;
  title: string;
  seconds?: number;
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SOP due',
      body: params.title,
      data: { type: 'sop_due', sopRunId: params.sopRunId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: params.seconds ?? 5,
    },
  });
}
