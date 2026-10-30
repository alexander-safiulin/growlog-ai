import { buildPlantQrUrl } from '@growlog/domain';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';

export type PlantLabelRow = {
  farmId: string;
  plantId: string;
  cultivarName: string;
  labelNumber: string;
  cycleName?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function qrImgTag(params: { farmId: string; plantId: string }): Promise<string> {
  const url = buildPlantQrUrl(params);
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 320,
  });
  return `<img src="${dataUrl}" width="140" height="140" alt="QR" />`;
}

async function labelCardHtml(row: PlantLabelRow): Promise<string> {
  const qr = await qrImgTag({ farmId: row.farmId, plantId: row.plantId });
  const title = escapeHtml(row.cultivarName || '—');
  const number = escapeHtml(row.labelNumber);
  const cycle = row.cycleName ? `<div class="cycle">${escapeHtml(row.cycleName)}</div>` : '';
  return `
    <div class="label">
      ${cycle}
      <div class="name">${title}</div>
      <div class="num">№ ${number}</div>
      <div class="qr">${qr}</div>
    </div>
  `;
}

async function labelsDocumentHtml(rows: PlantLabelRow[]): Promise<string> {
  const cards = await Promise.all(rows.map((row) => labelCardHtml(row)));
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1b4332; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 12px; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .label {
    width: 46%;
    min-width: 160px;
    box-sizing: border-box;
    border: 1px solid #a7f3d0;
    border-radius: 12px;
    padding: 10px 12px 12px;
    text-align: center;
    page-break-inside: avoid;
  }
  .cycle { font-size: 10px; color: #52796f; margin-bottom: 4px; }
  .name { font-size: 15px; font-weight: 700; line-height: 1.25; margin-bottom: 4px; }
  .num { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .qr { display: flex; justify-content: center; }
</style>
</head>
<body>
  <h1>Growlog plant labels</h1>
  <div class="grid">${cards.join('')}</div>
</body></html>`;
}

export async function printPlantLabels(rows: PlantLabelRow[]): Promise<'empty' | 'printed'> {
  if (!rows.length) return 'empty';
  const html = await labelsDocumentHtml(rows);
  await Print.printAsync({ html });
  return 'printed';
}

export async function sharePlantLabelsPdf(rows: PlantLabelRow[]): Promise<'empty' | 'shared'> {
  if (!rows.length) return 'empty';
  const html = await labelsDocumentHtml(rows);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Plant labels PDF',
      UTI: 'com.adobe.pdf',
    });
  }
  return 'shared';
}
