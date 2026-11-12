import type { AudienceType, ReportBlock, ReportJsonV1 } from '../../types/report';
import type { GrowReportEditorV1 } from './editor-layer';
import { blockNoteKey, editorFromStored, emptyGrowReportEditor, mediaNoteKey } from './editor-layer';
import { sanitizePublicReportText } from './sanitize-public';

export type GrowReportViewBlock = ReportBlock & {
  authorNote?: string;
  hidden?: boolean;
};

export type GrowReportTimelineItem = {
  at: string;
  eventType: string;
  summary: string;
  eventId?: string;
  authorNote?: string;
};

export type GrowReportPhotoItem = {
  mediaAssetId: string;
  caption: string | null;
  layoutRole: string;
  authorCaption?: string;
  hidden?: boolean;
};

export type GrowReportView = {
  title: string;
  intro?: string;
  outro?: string;
  audience: AudienceType;
  periodLabel: string;
  blocks: GrowReportViewBlock[];
  photos: GrowReportPhotoItem[];
  trustNotes: string[];
};

function isReportJsonV1(x: unknown): x is ReportJsonV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as ReportJsonV1;
  return o.pipeline_version === 'adr007-v1' && Array.isArray(o.blocks);
}

function applyAuthorText(text: string | undefined, publicAudience: boolean): string | undefined {
  if (!text) return undefined;
  return publicAudience ? sanitizePublicReportText(text) : text;
}

export function buildGrowReportView(params: {
  reportJson: unknown;
  editor?: unknown;
  audience: AudienceType;
  fallbackTitle: string;
}): GrowReportView {
  const editor: GrowReportEditorV1 =
    params.editor !== undefined && params.editor !== null
      ? editorFromStored(params.editor)
      : emptyGrowReportEditor();

  const publicAudience = params.audience === 'public_community';
  const rj = isReportJsonV1(params.reportJson) ? params.reportJson : null;
  const blocksRaw = rj?.blocks ?? [];
  const hiddenSet = new Set(editor.hiddenBlocks);
  const hiddenPhotos = new Set(editor.hiddenPhotos);

  const headerBlock = blocksRaw.find((b): b is Extract<ReportBlock, { kind: 'header' }> => b.kind === 'header');
  const title =
    applyAuthorText(editor.title, publicAudience) ?? headerBlock?.title ?? params.fallbackTitle;

  const header = blocksRaw.find((b) => b.kind === 'header');
  const periodLabel =
    header && header.kind === 'header' ? header.periodLabel : rj?.request.time_window
      ? `${rj.request.time_window.from.slice(0, 10)} — ${rj.request.time_window.to.slice(0, 10)}`
      : '';

  const blocks: GrowReportViewBlock[] = [];

  for (const b of blocksRaw) {
    if (b.kind === 'photos') continue;
    const key = blockNoteKey(b.kind);
    if (hiddenSet.has(key)) continue;
    const note = applyAuthorText(
      editor.blockNotes[key] ? editor.blockNotes[key] : undefined,
      publicAudience
    );
    const block: GrowReportViewBlock = { ...b, authorNote: note };
    if (b.kind === 'timeline_highlights' || b.kind === 'anomalies') {
      const items = b.items.map((item) => {
        const eid = 'eventId' in item ? item.eventId : undefined;
        const ikey = eid ? `event:${eid}` : undefined;
        const authorNote = ikey
          ? applyAuthorText(editor.itemNotes[ikey], publicAudience)
          : undefined;
        return { ...item, authorNote };
      });
      if (b.kind === 'timeline_highlights') {
        (block as Extract<ReportBlock, { kind: 'timeline_highlights' }>).items = items as Extract<
          ReportBlock,
          { kind: 'timeline_highlights' }
        >['items'];
      } else {
        (block as Extract<ReportBlock, { kind: 'anomalies' }>).items = items as Extract<
          ReportBlock,
          { kind: 'anomalies' }
        >['items'];
      }
    }
    blocks.push(block);
  }

  const photoBlock = blocksRaw.find((b) => b.kind === 'photos');
  const photos: GrowReportPhotoItem[] = [];
  if (
    photoBlock &&
    photoBlock.kind === 'photos' &&
    !hiddenSet.has(blockNoteKey('photos'))
  ) {
    for (const p of photoBlock.items) {
      if (hiddenPhotos.has(p.mediaAssetId)) continue;
      const authorCaption = applyAuthorText(
        editor.photoCaptions[mediaNoteKey(p.mediaAssetId)] ??
          editor.photoCaptions[p.mediaAssetId],
        publicAudience
      );
      photos.push({
        ...p,
        authorCaption,
      });
    }
  }

  return {
    title,
    intro: applyAuthorText(editor.intro, publicAudience),
    outro: applyAuthorText(editor.outro, publicAudience),
    audience: params.audience,
    periodLabel,
    blocks,
    photos,
    trustNotes: rj?.trust_notes ?? [],
  };
}

/** Visible block/photo counts after editor hide rules (for mobile PDF preview line). */
export function growReportPdfPreviewCounts(view: GrowReportView): { sections: number; photos: number } {
  return {
    sections: view.blocks.filter((b) => b.kind !== 'header').length,
    photos: view.photos.length,
  };
}
