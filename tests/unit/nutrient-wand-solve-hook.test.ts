/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { solveMagicWand } from '@growlog/nutrient-calc';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { defaultNutrientWorkspaceProductIds } from '@/lib/nutrient/default-fertilizers';
import { mergeCatalogAndFarmProducts } from '@/lib/nutrient/unified-products';
import {
  useNutrientSolve,
  type NutrientSolveParams,
} from '@/lib/nutrient/workspace/hooks';
import type { NutrientWandWorkerRequest } from '@/lib/nutrient/workspace/nutrient-wand.worker';

const WAND_DEBOUNCE_MS = 200;

const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');
const catalog = JSON.parse(readFileSync(bundlePath, 'utf8')) as CatalogBundle;

function baseSolveParams(): NutrientSolveParams {
  const unifiedProducts = mergeCatalogAndFarmProducts(catalog, [], {});
  const selectedProductIds = defaultNutrientWorkspaceProductIds(catalog);
  return {
    catalog,
    unifiedProducts,
    selectedProductIds,
    catalogProfileSlug: 'hoagland-standard',
    volumeL: 100,
    model: 'canonical',
    tankMode: 'ab',
    stockFactor: 100,
  };
}

let workerPostCount = 0;

let wandWorkerInstance: NutrientWandWorkerMock | null = null;

class NutrientWandWorkerMock {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  pending: NutrientWandWorkerRequest[] = [];

  constructor() {
    wandWorkerInstance = this;
  }

  postMessage(data: NutrientWandWorkerRequest) {
    workerPostCount += 1;
    this.pending.push(data);
    const result = solveMagicWand(data.input);
    this.onmessage?.({
      data: { id: data.id, result },
    } as MessageEvent);
  }

  addEventListener(type: string, fn: (ev: MessageEvent) => void) {
    if (type === 'message') this.onmessage = fn;
  }

  removeEventListener() {}

  terminate() {}
}

function WandSolveView(params: NutrientSolveParams) {
  const { result } = useNutrientSolve(params);
  if (!result) {
    return createElement('div', { 'data-testid': 'wand-pending' }, 'pending');
  }
  return createElement('div', { 'data-testid': 'wand-ready' }, String(result.best.doses.length));
}

describe('useNutrientSolve (wand worker)', () => {
  beforeEach(() => {
    workerPostCount = 0;
    wandWorkerInstance = null;
    vi.stubGlobal('Worker', NutrientWandWorkerMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts a single worker message when inputs are unchanged across re-renders', async () => {
    const params = baseSolveParams();
    const { rerender } = renderHook(() => useNutrientSolve({ ...params }));

    await act(async () => {
      vi.advanceTimersByTime(WAND_DEBOUNCE_MS + 50);
    });
    expect(workerPostCount).toBe(1);

    rerender();
    rerender();
    rerender();

    await act(async () => {
      vi.advanceTimersByTime(WAND_DEBOUNCE_MS + 50);
    });

    expect(workerPostCount).toBe(1);
  });

  it('ignores stale worker responses when inputs change rapidly', async () => {
    const params = baseSolveParams();
    const mgProduct = params.unifiedProducts.find((p) =>
      p.external_key.toLowerCase().includes('аптечный 25%'),
    );
    expect(mgProduct).toBeTruthy();
    const withoutMg = params.selectedProductIds.filter((id) => id !== mgProduct!.id);
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useNutrientSolve({ ...params, selectedProductIds: ids }),
      { initialProps: { ids: withoutMg } },
    );

    await act(async () => {
      vi.advanceTimersByTime(WAND_DEBOUNCE_MS + 10);
    });
    const worker = wandWorkerInstance!;
    const staleReq = worker.pending[0]!;
    rerender({ ids: params.selectedProductIds });
    await act(async () => {
      vi.advanceTimersByTime(WAND_DEBOUNCE_MS + 10);
    });
    expect(result.current?.result?.best.doses.some((d) => d.fertilizerId === mgProduct!.id)).toBe(true);

    const staleResult = solveMagicWand(staleReq.input);
    expect(staleResult.best.doses.some((d) => d.fertilizerId === mgProduct!.id)).toBe(false);
    await act(async () => {
      worker.onmessage?.({
        data: { id: staleReq.id, result: staleResult },
      } as MessageEvent);
    });
    expect(result.current?.result?.best.doses.some((d) => d.fertilizerId === mgProduct!.id)).toBe(true);
  });

  it('clears computing when debounced payload matches last posted worker payload', async () => {
    const params = baseSolveParams();
    const { result, rerender } = renderHook(() => useNutrientSolve({ ...params }));

    await act(async () => {
      vi.advanceTimersByTime(WAND_DEBOUNCE_MS + 50);
    });
    expect(result.current?.computing).toBe(false);
    expect(workerPostCount).toBe(1);

    rerender();
    await act(async () => {
      vi.advanceTimersByTime(WAND_DEBOUNCE_MS + 50);
    });

    expect(workerPostCount).toBe(1);
    expect(result.current?.computing).toBe(false);
  });

  it('renders wand doses after the worker returns', async () => {
    const params = baseSolveParams();
    render(createElement(WandSolveView, params));

    expect(screen.getByTestId('wand-pending')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(WAND_DEBOUNCE_MS + 50);
    });

    expect(screen.getByTestId('wand-ready').textContent).not.toBe('0');
    expect(workerPostCount).toBe(1);
  });
});
