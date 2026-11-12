import {
  DEFAULT_PHOTO_ANALYSIS_VERSION,
  extractStoredLeafSkill,
} from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';

export type LeafAnalysisPollState =
  | { status: 'waiting'; analysisStatus: string | null }
  | { status: 'ready'; analysisStatus: string; hypothesisCount: number }
  | { status: 'failed'; analysisStatus: string };

export const LEAF_ANALYSIS_POLL_MS = 2500;
export const LEAF_ANALYSIS_POLL_MAX_MS = 120_000;

export async function queryLeafAnalysisPollState(
  supabase: SupabaseClient,
  farmId: string,
  mediaAssetId: string,
): Promise<LeafAnalysisPollState> {
  const { data: asset, error: assetErr } = await supabase
    .from('media_assets')
    .select('analysis_status')
    .eq('farm_id', farmId)
    .eq('id', mediaAssetId)
    .maybeSingle();
  if (assetErr) throw assetErr;

  const analysisStatus =
    typeof asset?.analysis_status === 'string' ? asset.analysis_status : null;

  if (analysisStatus === 'analysis_failed') {
    return { status: 'failed', analysisStatus };
  }

  if (analysisStatus === 'analysis_ready') {
    const { data: row, error } = await supabase
      .from('photo_analysis')
      .select('signals')
      .eq('farm_id', farmId)
      .eq('media_asset_id', mediaAssetId)
      .eq('analysis_version', DEFAULT_PHOTO_ANALYSIS_VERSION)
      .maybeSingle();
    if (error) throw error;
    const stored = extractStoredLeafSkill(row?.signals);
    return {
      status: 'ready',
      analysisStatus,
      hypothesisCount: stored?.result.hypotheses.length ?? 0,
    };
  }

  return { status: 'waiting', analysisStatus };
}
