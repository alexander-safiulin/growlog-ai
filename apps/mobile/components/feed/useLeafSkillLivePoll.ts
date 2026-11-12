import { fetchLeafSkillLiveBatch } from '@/lib/poll-leaf-analysis';
import { useFarmContext } from '@/providers/FarmProvider';
import type { LeafSkillResult } from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';

function isTerminalStatus(status: string | null | undefined): boolean {
  return status === 'analysis_ready' || status === 'analysis_failed';
}

export function useLeafSkillLivePoll(params: {
  mediaAssetIds: string[];
  enabled: boolean;
}) {
  const { supabase, farmId } = useFarmContext();
  const ids = params.mediaAssetIds;
  const idsKey = ids.join('|');

  return useQuery({
    queryKey: ['leaf-skill-live', farmId, idsKey],
    enabled: params.enabled && !!farmId && ids.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2500;
      const allSettled = ids.every((id) => {
        const status = data.analysisStatus[id];
        if (isTerminalStatus(status)) return true;
        return Boolean(data.leafSkillByAssetId[id]);
      });
      return allSettled ? false : 2500;
    },
    queryFn: async (): Promise<{
      analysisStatus: Record<string, string | null>;
      leafSkillByAssetId: Record<string, LeafSkillResult>;
    }> => fetchLeafSkillLiveBatch(supabase, farmId!, ids),
  });
}
