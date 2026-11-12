import { ChartCard } from '@/components/charts/ChartCard';
import { LineChart } from '@/components/charts/LineChart';
import { EventMediaThumb } from '@/components/feed/EventMediaThumb';
import { AspectPhoto } from '@/components/media/AspectPhoto';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { shareGrowReportPdf } from '@/lib/grow-report-pdf';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useSingleFlight } from '@/lib/use-single-flight';
import { useFarmContext } from '@/providers/FarmProvider';
import { saveReportEditor } from '@growlog/api-client';
import {
  blockNoteKey,
  buildGrowReportView,
  editorFromStored,
  emptyGrowReportEditor,
  eventNoteKey,
  fetchReportById,
  mediaNoteKey,
  type GrowReportEditorV1,
  type ReportBlock,
  type ReportJsonV1,
} from '@growlog/domain';
import type { AudienceType } from '@growlog/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

function ReportPhotoThumb({ mediaAssetId }: { mediaAssetId: string }) {
  const { supabase, farmId } = useFarmContext();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('media_assets')
        .select('storage_path')
        .eq('farm_id', farmId)
        .eq('id', mediaAssetId)
        .maybeSingle();
      if (cancelled || !data?.storage_path) return;
      const { data: signed } = await supabase.storage
        .from('media')
        .createSignedUrl(data.storage_path as string, 3600);
      if (!cancelled && signed?.signedUrl) setUri(signed.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId, mediaAssetId, supabase]);

  if (!uri) return <View style={{ width: 72, height: 72 }} />;
  return (
    <Pressable style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden' }}>
      <AspectPhoto uri={uri} maxHeight={72} radius={8} />
    </Pressable>
  );
}

function isReportJsonV1(x: unknown): x is ReportJsonV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as ReportJsonV1;
  return o.pipeline_version === 'adr007-v1' && Array.isArray(o.blocks);
}

export default function GrowReportEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = typeof id === 'string' ? id : '';
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { strings } = useMobileLocale();
  const g = strings.growReport;
  const { supabase, farmId } = useFarmContext();
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ['grow-report', farmId, reportId],
    enabled: !!farmId && !!reportId,
    queryFn: () => fetchReportById(supabase, farmId!, reportId),
    refetchInterval: (query) => (query.state.data?.status === 'draft' ? 2500 : false),
  });

  const report = q.data;
  const audience = (report?.audience_type ?? 'archive_personal') as AudienceType;

  const [editor, setEditor] = useState<GrowReportEditorV1>(emptyGrowReportEditor());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirtyRef = useRef(false);
  const skipHydrate = useRef(false);

  useEffect(() => {
    if (!report || skipHydrate.current) return;
    setEditor(editorFromStored(report.editor_json));
  }, [report?.id, report?.updated_at, report?.editor_json, report]);

  const view = useMemo(() => {
    if (!report) return null;
    return buildGrowReportView({
      reportJson: report.report_json,
      editor,
      audience,
      fallbackTitle: report.title,
    });
  }, [report, editor, audience]);

  const persist = useCallback(async () => {
    if (!farmId || !reportId || !dirtyRef.current) return;
    setSaveState('saving');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await saveReportEditor(token, reportId, editor as unknown as Record<string, unknown>);
    dirtyRef.current = false;
    setSaveState('saved');
    await queryClient.invalidateQueries({ queryKey: ['grow-report', farmId, reportId] });
    setTimeout(() => setSaveState('idle'), 1500);
  }, [editor, farmId, queryClient, reportId, supabase]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = setTimeout(() => void persist(), 900);
    return () => clearTimeout(t);
  }, [editor, persist]);

  function patchEditor(patch: Partial<GrowReportEditorV1>) {
    dirtyRef.current = true;
    skipHydrate.current = true;
    setEditor((prev) => ({ ...prev, ...patch }));
  }

  function toggleHiddenBlock(kind: string) {
    const key = blockNoteKey(kind);
    const set = new Set(editor.hiddenBlocks);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    patchEditor({ hiddenBlocks: [...set] });
  }

  function toggleHiddenPhoto(mediaId: string) {
    const set = new Set(editor.hiddenPhotos);
    if (set.has(mediaId)) set.delete(mediaId);
    else set.add(mediaId);
    patchEditor({ hiddenPhotos: [...set] });
  }

  const { run: onPdf, busy: pdfBusy } = useSingleFlight();

  async function exportPdf() {
    if (!report || !farmId) return;
    await persist();
    await shareGrowReportPdf({
      supabase,
      report: { ...report, editor_json: editor as unknown as Record<string, unknown> },
      farmId,
    });
  }

  if (q.isLoading || !report) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const blocks: ReportBlock[] = isReportJsonV1(report.report_json) ? report.report_json.blocks : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {report.status === 'draft' ? (
        <Text style={styles.banner}>{g.generating}</Text>
      ) : null}

      <TextInput
        style={styles.input}
        value={editor.title ?? report.title}
        onChangeText={(t) => patchEditor({ title: t })}
        placeholder={g.customTitle}
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>{g.intro}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={editor.intro ?? ''}
        onChangeText={(t) => patchEditor({ intro: t })}
        multiline
        placeholderTextColor={colors.placeholder}
      />

      {view?.blocks.map((block, idx) => (
        <View key={`${block.kind}-${idx}`} style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={styles.blockTitle}>
              {block.kind === 'header' ||
              block.kind === 'executive_summary' ||
              block.kind === 'metric_strip' ||
              block.kind === 'timeline_highlights' ||
              block.kind === 'anomalies' ||
              block.kind === 'sop_compliance' ||
              block.kind === 'photos' ||
              block.kind === 'narrative' ||
              block.kind === 'missing_data' ||
              block.kind === 'appendix' ||
              block.kind === 'sensor_trends' ||
              block.kind === 'activity'
                ? block.title
                : block.kind}
            </Text>
            <Switch
              value={!editor.hiddenBlocks.includes(blockNoteKey(block.kind))}
              onValueChange={() => toggleHiddenBlock(block.kind)}
            />
          </View>
          {block.kind === 'sensor_trends'
            ? block.series.map((s) => (
                <ChartCard key={s.metricCode} title={s.metricLabel}>
                  <LineChart
                    width={320}
                    height={120}
                    series={[
                      {
                        points: s.points.map((p, i) => ({ x: i, y: p.avg })),
                        color: colors.primary,
                      },
                    ]}
                    bands={s.points.map((p, i) => ({
                      x: i,
                      min: p.min,
                      max: p.max,
                      color: colors.primary + '33',
                    }))}
                  />
                </ChartCard>
              ))
            : null}
          <TextInput
            style={styles.noteInput}
            value={editor.blockNotes[blockNoteKey(block.kind)] ?? ''}
            onChangeText={(t) =>
              patchEditor({
                blockNotes: { ...editor.blockNotes, [blockNoteKey(block.kind)]: t },
              })
            }
            placeholder={g.sectionNote}
            placeholderTextColor={colors.placeholder}
          />
        </View>
      ))}

      {blocks
        .filter((b): b is Extract<ReportBlock, { kind: 'timeline_highlights' }> => b.kind === 'timeline_highlights')
        .flatMap((b) => b.items)
        .filter((item) => item.eventId)
        .slice(0, 24)
        .map((item) => (
          <View key={item.eventId} style={styles.eventRow}>
            <Text style={styles.eventSummary} numberOfLines={2}>
              {item.summary}
            </Text>
            <TextInput
              style={styles.noteInput}
              value={editor.itemNotes[eventNoteKey(item.eventId!)] ?? ''}
              onChangeText={(t) =>
                patchEditor({
                  itemNotes: { ...editor.itemNotes, [eventNoteKey(item.eventId!)]: t },
                })
              }
              placeholder={`${g.eventNote} · ${g.authorLabel}`}
              placeholderTextColor={colors.placeholder}
            />
          </View>
        ))}

      {view?.photos.map((p) => (
        <View key={p.mediaAssetId} style={styles.photoRow}>
          <View style={styles.photoHead}>
            <ReportPhotoThumb mediaAssetId={p.mediaAssetId} />
            <Switch
              value={!editor.hiddenPhotos.includes(p.mediaAssetId)}
              onValueChange={() => toggleHiddenPhoto(p.mediaAssetId)}
            />
          </View>
          <TextInput
            style={styles.noteInput}
            value={
              editor.photoCaptions[mediaNoteKey(p.mediaAssetId)] ??
              editor.photoCaptions[p.mediaAssetId] ??
              p.authorCaption ??
              ''
            }
            onChangeText={(t) =>
              patchEditor({
                photoCaptions: { ...editor.photoCaptions, [mediaNoteKey(p.mediaAssetId)]: t },
              })
            }
            placeholder={g.photoCaption}
            placeholderTextColor={colors.placeholder}
          />
        </View>
      ))}

      <Text style={styles.label}>{g.outro}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={editor.outro ?? ''}
        onChangeText={(t) => patchEditor({ outro: t })}
        multiline
        placeholderTextColor={colors.placeholder}
      />

      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={() => void persist()}>
          <Text style={styles.secondaryText}>
            {saveState === 'saving' ? g.saving : saveState === 'saved' ? g.saved : g.save}
          </Text>
        </Pressable>
        <Pressable
          style={styles.btn}
          onPress={() => void onPdf(exportPdf)}
          disabled={pdfBusy || report.status === 'draft'}
        >
          {pdfBusy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.btnText}>{g.exportPdf}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.screen,
    },
    screen: { backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 48, gap: 10 },
    banner: {
      padding: 12,
      backgroundColor: c.warningSurface,
      borderRadius: 8,
      color: c.text,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    label: { fontSize: 13, fontWeight: '700', color: c.sectionLabel, marginTop: 8 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      backgroundColor: c.inputBg,
      color: c.text,
      fontSize: 16,
    },
    multiline: { minHeight: 88, textAlignVertical: 'top' },
    block: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: c.card,
      gap: 8,
    },
    blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    blockTitle: { fontSize: 15, fontWeight: '600', color: c.text, flex: 1 },
    noteInput: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    eventRow: { gap: 6, paddingVertical: 4 },
    eventSummary: { fontSize: 14, color: c.textMuted },
    photoRow: { gap: 8, marginTop: 8 },
    photoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btn: {
      flex: 1,
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    btnText: { color: c.primaryText, fontWeight: '600' },
    secondaryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryText: { color: c.primary, fontWeight: '600' },
  });
}
