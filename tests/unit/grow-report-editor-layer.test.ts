import { describe, expect, it } from 'vitest';
import {
  blockNoteKey,
  buildGrowReportView,
  editorFromStored,
  emptyGrowReportEditor,
  eventNoteKey,
  extractEditorPutPayload,
  parseEditorLayer,
  renderActivityBarsSvg,
  renderTrendBandSvg,
  renderGrowReportHtml,
  sanitizePublicReportText,
  validateGrowReportPeriod,
  formatGrowReportDateRange,
  growReportPdfPreviewCounts,
} from '@growlog/domain';
import type { ReportJsonV1 } from '@growlog/domain';

describe('extractEditorPutPayload', () => {
  it('strips farmId before parse', () => {
    const { farmId, editorInput } = extractEditorPutPayload({
      farmId: 'f1',
      intro: 'hi',
      version: 'grow-report-editor-v1',
    });
    expect(farmId).toBe('f1');
    const parsed = parseEditorLayer(editorInput);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.editor.intro).toBe('hi');
  });
});

describe('validateGrowReportPeriod', () => {
  it('rejects inverted range', () => {
    expect(validateGrowReportPeriod('2026-02-01', '2026-01-01').ok).toBe(false);
  });
});

describe('formatGrowReportDateRange', () => {
  it('formats UTC calendar range', () => {
    const s = formatGrowReportDateRange('2026-01-01', '2026-01-07', 'en-US');
    expect(s).toContain('2026');
    expect(s).toContain('—');
  });
});

describe('growReportPdfPreviewCounts', () => {
  it('excludes header block', () => {
    const view = buildGrowReportView({
      reportJson: {
        pipeline_version: 'adr007-v1',
        request: {
          report_type: 'cycle',
          audience_type: 'archive_personal',
          output_format: 'pdf',
          time_window: { from: '2026-01-01', to: '2026-01-07' },
          scope_label: 'A',
        },
        blocks: [
          { kind: 'header', title: 'T', periodLabel: 'P', scopeLabel: 'A' },
          { kind: 'executive_summary', title: 'Sum', body: 'x', trust: 'ai_generated' },
        ],
        trust_notes: [],
      },
      audience: 'archive_personal',
      fallbackTitle: 'F',
    });
    expect(growReportPdfPreviewCounts(view).sections).toBe(1);
  });
});

describe('parseEditorLayer', () => {
  it('rejects non-object input', () => {
    expect(parseEditorLayer('x').ok).toBe(false);
  });

  it('drops hiddenPhotos shorter than 8 chars', () => {
    const r = parseEditorLayer({ hiddenPhotos: ['m1', TEST_MEDIA_ID] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.editor.hiddenPhotos).toEqual([TEST_MEDIA_ID]);
  });

  it('drops invalid hidden block keys', () => {
    const r = parseEditorLayer({
      hiddenBlocks: ['block:timeline_highlights', 'nope', 'block:bad-key!'],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.editor.hiddenBlocks).toEqual(['block:timeline_highlights']);
    }
  });

  it('trims intro and caps length', () => {
    const long = 'a'.repeat(5000);
    const r = parseEditorLayer({ intro: long });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.editor.intro?.length).toBeLessThanOrEqual(4000);
  });
});

const TEST_MEDIA_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

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
        items: [{ mediaAssetId: TEST_MEDIA_ID, caption: 'Day 3', layoutRole: 'hero' }],
      },
    ],
    trust_notes: ['facts from DB'],
  };

  it('hides all photos when photos section hidden', () => {
    const editor = {
      ...emptyGrowReportEditor(),
      hiddenBlocks: [blockNoteKey('photos')],
    };
    const view = buildGrowReportView({
      reportJson,
      editor,
      audience: 'archive_personal',
      fallbackTitle: 'Fallback',
    });
    expect(view.photos.length).toBe(0);
  });

  it('hides blocks and photos per editor', () => {
    const editor = {
      ...emptyGrowReportEditor(),
      hiddenBlocks: [blockNoteKey('timeline_highlights')],
      hiddenPhotos: [TEST_MEDIA_ID],
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
    expect(html.match(/<h1/g)?.length).toBe(1);
  });
});

describe('sanitizePublicReportText', () => {
  it('strips uuid-like tokens', () => {
    const t = sanitizePublicReportText('id 123e4567-e89b-12d3-a456-426614174000');
    expect(t).not.toContain('123e4567');
  });
});
