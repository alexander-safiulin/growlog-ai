import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseGheFloraSnapshot,
  parseHydroBuddySaltsSnapshot,
} from '../../scripts/nutrient-import/parse-manufacturer-snapshot.ts';

const manufacturersDir = path.join(
  process.cwd(),
  'supabase/seed/nutrient/manufacturers',
);

describe('manufacturer snapshot parsers', () => {
  it('parses GHE Flora feed chart snapshot', () => {
    const raw = JSON.parse(
      readFileSync(path.join(manufacturersDir, 'ghe-flora-3part.snapshot.json'), 'utf8'),
    );
    const snap = parseGheFloraSnapshot(raw);
    expect(snap.source.slug).toBe('terra-aquatica-ghe-flora-feedchart');
    expect(snap.feed_schedule.steps).toHaveLength(3);
    expect(snap.feed_schedule.steps[0].dose_per_l).toBe(4);
    expect(snap.product_label_links).toHaveLength(3);
  });

  it('parses HydroBuddy salts snapshot', () => {
    const raw = JSON.parse(
      readFileSync(path.join(manufacturersDir, 'hydrobuddy-salts.snapshot.json'), 'utf8'),
    );
    const snap = parseHydroBuddySaltsSnapshot(raw);
    expect(snap.source.provenance_class).toBe('community');
    expect(snap.salts[0].external_key).toBe('hydrobuddy|k2so4');
    expect(snap.salts[0].declared_pct.K2O).toBe(53);
  });
});
