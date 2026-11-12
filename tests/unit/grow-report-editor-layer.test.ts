import { describe, expect, it } from 'vitest';
import {
  blockNoteKey,
  buildGrowReportView,
  editorFromStored,
  emptyGrowReportEditor,
  eventNoteKey,
  parseEditorLayer,
  renderActivityBarsSvg,
  renderTrendBandSvg,
  renderGrowReportHtml,
  sanitizePublicReportText,
} from '@growlog/domain';
import type { ReportJsonV1 } from '@growlog/domain';

describe('parseEditorLayer', () => {
  it('rejects non-object input', () => {
    expect(parseEditorLayer('x').ok).toBe(false);
  });

  it('trims intro and caps length', () => {
    const long = 'a'.repeat(5000);
    const r = parseEditorLayer({ intro: long });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.editor.intro?.length).toBeLessThanOrEqual(4000);
  });
});

describe('buildGrowReportView', () => {
  const reportJson: ReportJsonV1 = {
    pipeline_version: 'adr007-v1',
    request: {
      report_type: 'cycle',
      audience_type: 'archive_personal',
      output_format: 'pdf',
      time_window: { from: '2026-01-01T00:00:00Z', to: '2026-01-07T00:00:00Z' },
      scope_label: 'Room A',
    },
    blocks: [
      {
        kind: 'header',
        title: 'Cycle report',
        periodLabel: '2026-01-01 — 2026-01-07',
        scopeLabel: 'Room A',
        cycleName: 'Run 1',
        cycleStage: 'veg',
      },
      {
        kind: 'timeline_highlights',
        title: 'Events',
        items: [{ at: '2026-01-02', eventType: 'feeding', summary: 'Fed', eventId: 'e1' }],
      },
      {
        kind: 'photos',
        title: 'Photos',
        items: [{ mediaAssetId: 'm1', caption: 'Day 3', layoutRole: 'hero' }],
      },
    ],
    trust_notes: ['facts from DB'],
  };

  it('hides blocks and photos per editor', () => {
    const editor = {
      ...emptyGrowReportEditor(),
      hiddenBlocks: [blockNoteKey('timeline_highlights')],
      hiddenPhotos: ['m1'],
      intro: 'Hello',
    };
    const view = buildGrowReportView({
      reportJson,
      editor,
      audience: 'archive_personal',
      fallbackTitle: 'Fallback',
    });
    expect(view.intro).toBe('Hello');
    expect(view.blocks.some((b) => b.kind === 'timeline_highlights')).toBe(false);
    expect(view.photos.length).toBe(0);
  });

  it('sanitizes author text for public audience', () => {
    const editor = {
      ...emptyGrowReportEditor(),
      itemNotes: {
        [eventNoteKey('e1')]: 'farm_id note',
      },
    };
    const view = buildGrowReportView({
      reportJson,
      editor,
      audience: 'public_community',
      fallbackTitle: 'x',
    });
    const tl = view.blocks.find((b) => b.kind === 'timeline_highlights');
    expect(tl && tl.kind === 'timeline_highlights' ? tl.items[0].authorNote : '').toContain('project');
  });
});

describe('chart svg', () => {
  it('renders empty trend chart', () => {
    expect(renderTrendBandSvg({ points: [] })).toContain('svg');
  });

  it('renders activity bars', () => {
    const svg = renderActivityBarsSvg({
      points: [
        { date: '2026-01-01', count: 2 },
        { date: '2026-01-02', count: 5 },
      ],
    });
    expect(svg).toContain('rect');
  });
});

describe('renderGrowReportHtml', () => {
  it('includes intro and missing photo gracefully', () => {
    const view = buildGrowReportView({
      reportJson: {
        pipeline_version: 'adr007-v1',
        request: {
          report_type: 'cycle',
          audience_type: 'archive_personal',
          output_format: 'pdf',
          time_window: { from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' },
          scope_label: 'x',
        },
        blocks: [
          {
            kind: 'header',
            title: 'T',
            periodLabel: 'p',
            scopeLabel: 's',
            cycleName: null,
            cycleStage: null,
          },
          {
            kind: 'missing_data',
            title: 'Gaps',
            notes: ['No sensors'],
          },
        ],
        trust_notes: [],
      },
      editor: editorFromStored({ intro: 'My story' }),
      audience: 'archive_personal',
      fallbackTitle: 'T',
    });
    const html = renderGrowReportHtml(view);
    expect(html).toContain('My story');
    expect(html).toContain('No sensors');
  });
});

describe('sanitizePublicReportText', () => {
  it('strips uuid-like tokens', () => {
    const t = sanitizePublicReportText('id 123e4567-e89b-12d3-a456-426614174000');
    expect(t).not.toContain('123e4567');
  });
});
