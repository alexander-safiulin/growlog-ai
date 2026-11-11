import type { SupabaseClient } from '@supabase/supabase-js';
import { hasLocalWorkspaceEntityId } from '../mobile/local-workspace';
import type { ProductLocale } from '../i18n/mobile-strings';
import { resolveAiLocaleFromFarmSettings, withFarmAiLocale } from '../i18n/farm-locale';

export { resolveAiLocaleFromFarmSettings, withFarmAiLocale };

export async function persistFarmAiLocale(
  supabase: SupabaseClient,
  params: { farmId: string; aiLocale: ProductLocale }
): Promise<void> {
  if (hasLocalWorkspaceEntityId(params.farmId)) return;
  const { data: farm, error: readErr } = await supabase
    .from('farms')
    .select('settings')
    .eq('id', params.farmId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!farm) throw new Error('farm_not_found');
  const settings = withFarmAiLocale(
    (farm as { settings?: Record<string, unknown> }).settings,
    params.aiLocale
  );
  const { error } = await supabase.from('farms').update({ settings }).eq('id', params.farmId);
  if (error) throw error;
}
