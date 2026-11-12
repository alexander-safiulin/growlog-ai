import {
  buildGrowReportView,
  editorFromStored,
  renderGrowReportHtml,
  type AudienceType,
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
    .select('storage_path')
    .eq('farm_id', farmId)
    .eq('id', mediaAssetId)
    .maybeSingle();
  if (!asset?.storage_path) return null;
  const { data: signed, error } = await supabase.storage
    .from('media')
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

export async function shareGrowReportPdf(params: {
  supabase: SupabaseClient;
  report: ReportRow;
  farmId: string;
  locale?: string;
}): Promise<'shared' | 'failed'> {
  const audience = (params.report.audience_type ?? 'archive_personal') as AudienceType;
  const view = buildGrowReportView({
    reportJson: params.report.report_json,
    editor: params.report.editor_json ?? editorFromStored({}),
    audience,
    fallbackTitle: params.report.title,
  });

  const images: { mediaAssetId: string; dataUrl: string; caption?: string }[] = [];
  for (const p of view.photos.slice(0, 12)) {
    const dataUrl = await signedImageDataUrl(params.supabase, params.farmId, p.mediaAssetId);
    if (dataUrl) {
      images.push({
        mediaAssetId: p.mediaAssetId,
        dataUrl,
        caption: p.authorCaption ?? p.caption ?? undefined,
      });
    }
  }

  const html = renderGrowReportHtml(view, { images, locale: params.locale ?? 'en' });
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: view.title,
        UTI: 'com.adobe.pdf',
      });
      return 'shared';
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}
