'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import {
  fetchTuyaClimateForFarm,
  type TuyaFarmClimateResponse,
} from '@/lib/growlog/tuya-devices-client';
import { useQuery } from '@tanstack/react-query';

export const TUYA_DEVICES_QUERY_KEY = 'tuya-devices';

export function useTuyaClimateDevices() {
  const { supabase, farmId } = useFarmContext();
  return useQuery({
    queryKey: [TUYA_DEVICES_QUERY_KEY, farmId],
    enabled: Boolean(farmId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<TuyaFarmClimateResponse> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token || !farmId) throw new Error('unauthorized');
      return fetchTuyaClimateForFarm(farmId, token);
    },
  });
}

/** @deprecated use useTuyaClimateDevices */
export function useTuyaDevices() {
  const query = useTuyaClimateDevices();
  return {
    ...query,
    data: query.data?.devices,
  };
}
