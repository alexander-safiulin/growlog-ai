import type { ReportBlock } from '../../types/report';
import type { GrowReportView } from './report-view';
import { renderActivityBarsSvg, renderTrendBandSvg } from './chart-svg';

export type GrowReportHtmlImage = {
  mediaAssetId: string;
  dataUrl: string;
  caption?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trustBadge(kind: string): string {
  const map: Record<string, string> = {
    observed_fact: 'Fact',
    derived_metric: 'Derived',
    ai_generated: 'AI',
    missing_data: 'Gap',
    author_comment: 'Author',
  };
  return map[kind] ?? kind;
}

function renderBlockHtml(block: ReportBlock, authorNote?: string): string {
  const note = authorNote
    ? `<p class="author-note"><span class="badge">${trustBadge('author_comment')}</span> ${esc(authorNote)}</p>`
    : '';

  switch (block.kind) {
    case 'header':
      return `<header class="hero-meta"><h1>${esc(block.title)}</h1><p class="muted">${esc(block.periodLabel)} · ${esc(block.scopeLabel)}${block.cycleName ? ` · ${esc(block.cycleName)}` : ''}</p></header>`;
    case 'executive_summary':
    case 'narrative':
    case 'appendix':
      return `<section><h2>${esc(block.title)} <span class="badge">${trustBadge(block.trust)}</span></h2><p>${esc(block.body).replace(/\n/g, '<br/>')}</p>${note}</section>`;
    case 'metric_strip':
      return `<section><h2>${esc(block.title)}</h2><div class="metrics">${block.items
        .map(
          (i) =>
            `<div class="metric-card"><div class="metric-label">${esc(i.label)}</div><div class="metric-val">${esc(i.value)}</div></div>`
        )
        .join('')}</div>${note}</section>`;
    case 'sensor_trends':
      return `<section><h2>${esc(block.title)}</h2>${block.series
        .map((s) => {
          const svg = renderTrendBandSvg({ points: s.points });
          return `<div class="chart-wrap"><h3>${esc(s.metricLabel)}${s.unit ? ` (${esc(s.unit)})` : ''}</h3>${svg}</div>`;
        })
        .join('')}${note}</section>`;
    case 'activity':
      return `<section><h2>${esc(block.title)}</h2><div class="chart-wrap">${renderActivityBarsSvg({ points: block.points })}</div>${note}</section>`;
    case 'timeline_highlights':
    case 'anomalies':
    case 'sop_compliance':
      return `<section><h2>${esc(block.title)}</h2><ul>${block.items
        .map((item) => {
          const line: string =
            'summary' in item && typeof item.summary === 'string'
              ? item.summary
              : 'title' in item && typeof item.title === 'string'
                ? item.title
                : '';
          const note =
            'authorNote' in item && typeof (item as { authorNote?: string }).authorNote === 'string'
              ? (item as { authorNote: string }).authorNote
              : '';
          const an = note ? ` <em class="author-inline">(${esc(note)})</em>` : '';
          return `<li>${esc(line)}${an}</li>`;
        })
        .join('')}</ul>${note}</section>`;
    case 'missing_data':
      return `<section class="gaps"><h2>${esc(block.title)}</h2><ul>${block.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></section>`;
  case 'photos':
    return '';
    default:
      return '';
  }
}

export function renderGrowReportHtml(
  view: GrowReportView,
  opts?: { images?: GrowReportHtmlImage[]; locale?: string }
): string {
  const images = opts?.images ?? [];
  const byId = new Map(images.map((i) => [i.mediaAssetId, i]));
  const hero = view.photos.find((p) => p.layoutRole === 'hero') ?? view.photos[0];
  const heroImg = hero ? byId.get(hero.mediaAssetId) : undefined;

  const intro = view.intro
    ? `<section class="intro"><h2>Introduction <span class="badge">${trustBadge('author_comment')}</span></h2><p>${esc(view.intro).replace(/\n/g, '<br/>')}</p></section>`
    : '';

  const outro = view.outro
    ? `<section class="outro"><h2>Closing notes <span class="badge">${trustBadge('author_comment')}</span></h2><p>${esc(view.outro).replace(/\n/g, '<br/>')}</p></section>`
    : '';

  const blocksHtml = view.blocks
    .map((b) => renderBlockHtml(b, b.authorNote))
    .join('\n');

  const gallery = view.photos.length
    ? `<section class="gallery"><h2>Photos</h2><div class="photo-grid">${view.photos
        .map((p) => {
          const img = byId.get(p.mediaAssetId);
          const cap = p.authorCaption ?? p.caption ?? '';
          if (!img) return `<div class="photo-placeholder">${esc(cap || p.mediaAssetId.slice(0, 8))}</div>`;
          const cls = p.layoutRole === 'hero' ? 'photo hero' : 'photo';
          return `<figure class="${cls}"><img src="${img.dataUrl}" alt=""/><figcaption>${esc(cap)}</figcaption></figure>`;
        })
        .join('')}</div></section>`
    : '';

  const footer = `<footer class="trust">${view.trustNotes.map((t) => `<p class="small">${esc(t)}</p>`).join('')}<p class="small">Growlog · ${esc(view.periodLabel)}</p></footer>`;

  return `<!DOCTYPE html>
<html lang="${opts?.locale ?? 'en'}">
<head>
<meta charset="utf-8"/>
<title>${esc(view.title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1b4332; font-size: 14px; line-height: 1.45; margin: 0; padding: 20px; }
  h1 { font-size: 26px; margin: 0 0 8px; }
  h2 { font-size: 16px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; color: #2d6a4f; }
  h3 { font-size: 13px; margin: 8px 0; color: #40916c; }
  .muted { color: #52796f; font-size: 13px; }
  .badge { font-size: 10px; background: #d8f3dc; color: #1b4332; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; vertical-align: middle; }
  .metrics { display: flex; flex-wrap: wrap; gap: 8px; }
  .metric-card { background: #f8fdf9; border: 1px solid #b7e4c7; border-radius: 8px; padding: 10px 12px; min-width: 120px; }
  .metric-label { font-size: 11px; color: #52796f; }
  .metric-val { font-size: 16px; font-weight: 600; }
  .chart-wrap { margin: 8px 0 16px; }
  ul { padding-left: 18px; margin: 0; }
  li { margin-bottom: 6px; }
  .author-note, .author-inline { color: #355e4a; font-style: italic; }
  .gaps { background: #fff8e6; border: 1px solid #ffe08a; border-radius: 8px; padding: 12px; }
  .cover { margin-bottom: 24px; border-bottom: 2px solid #b7e4c7; padding-bottom: 16px; }
  .cover img { width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; }
  .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .photo img { width: 100%; border-radius: 8px; }
  .photo.hero { grid-column: span 2; }
  figcaption { font-size: 11px; color: #52796f; margin-top: 4px; }
  .small { font-size: 11px; color: #6b7c75; }
  footer.trust { margin-top: 32px; border-top: 1px solid #d8e9df; padding-top: 12px; }
</style>
</head>
<body>
  <div class="cover">
    ${heroImg ? `<img src="${heroImg.dataUrl}" alt=""/>` : ''}
    <h1>${esc(view.title)}</h1>
    <p class="muted">${esc(view.periodLabel)}</p>
  </div>
  ${intro}
  ${blocksHtml}
  ${gallery}
  ${outro}
  ${footer}
</body>
</html>`;
}
