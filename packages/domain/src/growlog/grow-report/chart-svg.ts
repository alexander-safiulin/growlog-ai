export type TrendPoint = { date: string; min: number; max: number; avg: number };

export function renderTrendBandSvg(params: {
  points: TrendPoint[];
  width?: number;
  height?: number;
  stroke?: string;
  bandFill?: string;
}): string {
  const w = params.width ?? 520;
  const h = params.height ?? 140;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = params.points.filter((p) => Number.isFinite(p.avg));
  if (!pts.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><text x="${pad.l}" y="${h / 2}" fill="#6b7c75" font-size="12">—</text></svg>`;
  }

  const ymin = Math.min(...pts.map((p) => p.min));
  const ymax = Math.max(...pts.map((p) => p.max));
  const span = ymax - ymin || 1;

  const xAt = (i: number) => pad.l + (i / Math.max(1, pts.length - 1)) * innerW;
  const yAt = (v: number) => pad.t + innerH - ((v - ymin) / span) * innerH;

  const avgLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.avg).toFixed(1)}`).join(' ');

  let band = '';
  if (pts.length >= 2) {
    const top = pts.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.max).toFixed(1)}`).join(' L ');
    const bot = [...pts]
      .reverse()
      .map((p, i) => {
        const idx = pts.length - 1 - i;
        return `${xAt(idx).toFixed(1)},${yAt(p.min).toFixed(1)}`;
      })
      .join(' L ');
    band = `<path d="M ${top} L ${bot} Z" fill="${params.bandFill ?? 'rgba(27,67,50,0.12)'}"/>`;
  }

  const labels = pts.length <= 8 ? pts.map((p, i) => {
    const x = xAt(i);
    return `<text x="${x}" y="${h - 6}" text-anchor="middle" fill="#6b7c75" font-size="9">${escapeXml(p.date.slice(5))}</text>`;
  }).join('') : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${band}
  <path d="${avgLine}" fill="none" stroke="${params.stroke ?? '#1b4332'}" stroke-width="2"/>
  ${labels}
</svg>`;
}

export function renderActivityBarsSvg(params: {
  points: { date: string; count: number }[];
  width?: number;
  height?: number;
}): string {
  const w = params.width ?? 520;
  const h = params.height ?? 100;
  const pad = { l: 8, r: 8, t: 8, b: 24 };
  const pts = params.points.slice(-31);
  if (!pts.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="12" y="${h / 2}" fill="#6b7c75" font-size="12">—</text></svg>`;
  }
  const max = Math.max(1, ...pts.map((p) => p.count));
  const barW = (w - pad.l - pad.r) / pts.length;
  const innerH = h - pad.t - pad.b;
  const bars = pts
    .map((p, i) => {
      const bh = (p.count / max) * innerH;
      const x = pad.l + i * barW + 1;
      const y = pad.t + innerH - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, barW - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="#40916c"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
