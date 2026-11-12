import {
  buildGrowReportView,
  editorFromStored,
  renderGrowReportHtml,
  type AudienceType,
  type GrowReportHtmlLabels,
  type ReportRow,
} from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function signedImageDataUrl(
  supabase: SupabaseClient,
  farmId: string,
  mediaAssetId: string
): Promise<string | null> {
  const { data: asset } = await supabase
    .from('media_assets')
    .select('storage_bucket, storage_path')
    .eq('farm_id', farmId)
    .eq('id', mediaAssetId)
    .maybeSingle();
  const bucket = (asset?.storage_bucket as string | undefined) ?? 'media';
  if (!asset?.storage_path) return null;
  const { data: signed, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(asset.storage_path as string, 120);
  if (error || !signed?.signedUrl) return null;

  const res = await fetch(signed.signedUrl);
  if (!res.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File(Paths.cache, `grow-report-${mediaAssetId}.jpg`);
  file.create({ overwrite: true });
  file.write(bytes);

  const manipulated = await ImageManipulator.manipulateAsync(
    file.uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) return null;
  return `data:image/jpeg;base64,${manipulated.base64}`;
}

export type GrowReportPdfResult = 'shared' | 'draft' | 'failed' | 'sharing_unavailable';

export async function shareGrowReportPdf(params: {
  supabase: SupabaseClient;
  report: ReportRow;
  farmId: string;
  locale?: string;
  htmlLabels?: Partial<GrowReportHtmlLabels>;
  shareDialogTitle?: string;
}): Promise<GrowReportPdfResult> {
  if (params.report.status === 'draft') return 'draft';
  if (params.report.status === 'failed') return 'failed';

  const audience = (params.report.audience_type ?? 'archive_personal') as AudienceType;
  const view = buildGrowReportView({
    reportJson: params.report.report_json,
    editor: params.report.editor_json ?? editorFromStored({}),
    audience,
    fallbackTitle: params.report.title,
  });

  const images: { mediaAssetId: string; dataUrl: string; caption?: string }[] = [];
  const photoCap = Math.min(12, view.photos.length);
  for (let i = 0; i < photoCap; i += 1) {
    const p = view.photos[i]!;
    const dataUrl = await signedImageDataUrl(params.supabase, params.farmId, p.mediaAssetId);
    if (dataUrl) {
      images.push({
        mediaAssetId: p.mediaAssetId,
        dataUrl,
        caption: p.authorCaption ?? p.caption ?? undefined,
      });
    }
  }

  const html = renderGrowReportHtml(view, {
    images,
    locale: params.locale ?? 'en',
    labels: params.htmlLabels,
  });
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: params.shareDialogTitle ?? view.title,
        UTI: 'com.adobe.pdf',
      });
      return 'shared';
    }
    return 'sharing_unavailable';
  } catch {
    return 'failed';
  }
}
