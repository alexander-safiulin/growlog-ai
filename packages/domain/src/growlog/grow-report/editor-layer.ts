/** ADR-018: user-authored layer on reports (validated, size-bounded). */

export const GROW_REPORT_EDITOR_VERSION = 'grow-report-editor-v1' as const;

const MAX_TITLE = 240;
const MAX_INTRO = 4000;
const MAX_OUTRO = 4000;
const MAX_NOTE = 2000;
const MAX_CAPTION = 500;
const MAX_MAP_KEYS = 120;

export type GrowReportEditorV1 = {
  version: typeof GROW_REPORT_EDITOR_VERSION;
  title?: string;
  intro?: string;
  outro?: string;
  blockNotes: Record<string, string>;
  itemNotes: Record<string, string>;
  photoCaptions: Record<string, string>;
  hiddenBlocks: string[];
  hiddenPhotos: string[];
};

export type ParseEditorLayerResult =
  | { ok: true; editor: GrowReportEditorV1 }
  | { ok: false; error: string };

function trimNote(s: string, max: number): string {
  return s.trim().slice(0, max);
}

function parseStringMap(raw: unknown, maxLen: number, maxKeys: number): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= maxKeys) break;
    if (typeof k !== 'string' || k.length > 80) continue;
    if (typeof v !== 'string') continue;
    const t = trimNote(v, maxLen);
    if (t) out[k] = t;
  }
  return out;
}

function parseStringList(raw: unknown, maxKeys: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (out.length >= maxKeys) break;
    if (typeof v === 'string' && v.length <= 80) out.push(v);
  }
  return out;
}

export function emptyGrowReportEditor(): GrowReportEditorV1 {
  return {
    version: GROW_REPORT_EDITOR_VERSION,
    blockNotes: {},
    itemNotes: {},
    photoCaptions: {},
    hiddenBlocks: [],
    hiddenPhotos: [],
  };
}

export function parseEditorLayer(input: unknown): ParseEditorLayerResult {
  if (input === null || input === undefined) {
    return { ok: true, editor: emptyGrowReportEditor() };
  }
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'editor_json must be an object' };
  }
  const o = input as Record<string, unknown>;
  const version = o.version;
  if (version !== undefined && version !== GROW_REPORT_EDITOR_VERSION) {
    return { ok: false, error: 'unsupported editor version' };
  }

  const editor: GrowReportEditorV1 = {
    version: GROW_REPORT_EDITOR_VERSION,
    blockNotes: parseStringMap(o.blockNotes, MAX_NOTE, MAX_MAP_KEYS),
    itemNotes: parseStringMap(o.itemNotes, MAX_NOTE, MAX_MAP_KEYS),
    photoCaptions: parseStringMap(o.photoCaptions, MAX_CAPTION, MAX_MAP_KEYS),
    hiddenBlocks: parseStringList(o.hiddenBlocks, MAX_MAP_KEYS),
    hiddenPhotos: parseStringList(o.hiddenPhotos, MAX_MAP_KEYS),
  };

  if (typeof o.title === 'string') {
    const t = trimNote(o.title, MAX_TITLE);
    if (t) editor.title = t;
  }
  if (typeof o.intro === 'string') {
    const t = trimNote(o.intro, MAX_INTRO);
    if (t) editor.intro = t;
  }
  if (typeof o.outro === 'string') {
    const t = trimNote(o.outro, MAX_OUTRO);
    if (t) editor.outro = t;
  }

  return { ok: true, editor };
}

export function editorFromStored(raw: unknown): GrowReportEditorV1 {
  const parsed = parseEditorLayer(raw);
  return parsed.ok ? parsed.editor : emptyGrowReportEditor();
}

export function blockNoteKey(kind: string): string {
  return `block:${kind}`;
}

export function eventNoteKey(eventId: string): string {
  return `event:${eventId}`;
}

export function mediaNoteKey(mediaAssetId: string): string {
  return `media:${mediaAssetId}`;
}
