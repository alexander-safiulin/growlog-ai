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

class NutrientWandWorkerMock {
  onmessage: ((ev: MessageEvent) => void) | null = null;

  postMessage(data: NutrientWandWorkerRequest) {
    workerPostCount += 1;
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
  const result = useNutrientSolve(params);
  if (!result) {
    return createElement('div', { 'data-testid': 'wand-pending' }, 'pending');
  }
  return createElement('div', { 'data-testid': 'wand-ready' }, String(result.best.doses.length));
}

describe('useNutrientSolve (wand worker)', () => {
  beforeEach(() => {
    workerPostCount = 0;
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
