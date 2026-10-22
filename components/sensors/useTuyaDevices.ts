'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { fetchTuyaDevicesForFarm } from '@/lib/growlog/tuya-devices-client';
import type { TuyaDeviceView } from '@/lib/tuya/client';
import { useQuery } from '@tanstack/react-query';

export const TUYA_DEVICES_QUERY_KEY = 'tuya-devices';

export function useTuyaDevices() {
  const { supabase, farmId } = useFarmContext();
  return useQuery({
    queryKey: [TUYA_DEVICES_QUERY_KEY, farmId],
    enabled: Boolean(farmId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<TuyaDeviceView[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token || !farmId) throw new Error('unauthorized');
      return fetchTuyaDevicesForFarm(farmId, token);
    },
  });
}
