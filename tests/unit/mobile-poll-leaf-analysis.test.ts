import { describe, expect, it, vi } from 'vitest';
import { queryLeafAnalysisPollState } from '../../apps/mobile/lib/poll-leaf-analysis';

type QueryResult = { data: unknown; error: null | { message: string } };

function mockSupabase(handlers: {
  mediaAsset?: QueryResult;
  photoAnalysis?: QueryResult;
}) {
  const from = vi.fn((table: string) => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        if (table === 'media_assets') return handlers.mediaAsset ?? { data: null, error: null };
        if (table === 'photo_analysis') return handlers.photoAnalysis ?? { data: null, error: null };
        return { data: null, error: null };
      }),
    };
    return chain;
  });
  return { from } as unknown as Parameters<typeof queryLeafAnalysisPollState>[0];
}

describe('queryLeafAnalysisPollState', () => {
  it('returns waiting while analysis is queued', async () => {
    const supabase = mockSupabase({
      mediaAsset: { data: { analysis_status: 'processing_analysis' }, error: null },
    });
    const state = await queryLeafAnalysisPollState(supabase, 'farm-1', 'asset-1');
    expect(state).toEqual({ status: 'waiting', analysisStatus: 'processing_analysis' });
  });

  it('returns failed when media asset analysis failed', async () => {
    const supabase = mockSupabase({
      mediaAsset: { data: { analysis_status: 'analysis_failed' }, error: null },
    });
    const state = await queryLeafAnalysisPollState(supabase, 'farm-1', 'asset-1');
    expect(state).toEqual({ status: 'failed', analysisStatus: 'analysis_failed' });
  });

  it('returns ready with hypothesis count from stored leaf skill', async () => {
    const supabase = mockSupabase({
      mediaAsset: { data: { analysis_status: 'analysis_ready' }, error: null },
      photoAnalysis: {
        data: {
          signals: {
            leaf_diagnosis_v1: {
              observation: {
                leaf_age: 'unknown',
                canopy_position: 'unknown',
                color_pattern: 'unknown',
                vein_status: 'unknown',
                edge_symptom: 'unknown',
                spotting: 'unknown',
              },
              result: {
                version: 'leaf_diagnosis_v1',
                hypotheses: [
                  { code: 'nitrogen', label: 'N', score: 0.5, mobile: true, rationale: '' },
                ],
                missing_data: [],
                next_step: { kind: 'none', prompt: '' },
              },
            },
          },
        },
        error: null,
      },
    });
    const state = await queryLeafAnalysisPollState(supabase, 'farm-1', 'asset-1');
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.hypothesisCount).toBe(1);
    }
  });
});
