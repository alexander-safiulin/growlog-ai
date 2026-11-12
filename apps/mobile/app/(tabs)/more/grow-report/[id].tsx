import { ChartCard } from '@/components/charts/ChartCard';
import { LineChart } from '@/components/charts/LineChart';
import { AspectPhoto } from '@/components/media/AspectPhoto';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { dismissGrowReportCoach, isGrowReportCoachDismissed } from '@/lib/grow-report-coach';
import { shareGrowReportPdf } from '@/lib/grow-report-pdf';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useSingleFlight } from '@/lib/use-single-flight';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  blockNoteKey,
  buildGrowReportView,
  editorFromStored,
  emptyGrowReportEditor,
  eventNoteKey,
  fetchReportById,
  growReportPdfPreviewCounts,
  mediaNoteKey,
  saveReportEditorLayer,
  type GrowReportEditorV1,
  type ReportBlock,
  type ReportJsonV1,
} from '@growlog/domain';
import type { AudienceType } from '@growlog/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
        .select('storage_bucket, storage_path')
        .eq('farm_id', farmId)
        .eq('id', mediaAssetId)
        .maybeSingle();
      const bucket = (data?.storage_bucket as string | undefined) ?? 'media';
      if (cancelled || !data?.storage_path) return;
      const { data: signed } = await supabase.storage
        .from(bucket)
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
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { strings, locale } = useMobileLocale();
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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [readyNudge, setReadyNudge] = useState(false);
  const dirtyRef = useRef(false);
  const autosavePausedRef = useRef(false);
  const skipHydrate = useRef(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    skipHydrate.current = false;
    dirtyRef.current = false;
    setSaveState('idle');
    setSaveError(null);
    setExportError(null);
    autosavePausedRef.current = false;
  }, [reportId]);

  useEffect(() => {
    let cancelled = false;
    void isGrowReportCoachDismissed().then((dismissed) => {
      if (!cancelled) setShowCoach(!dismissed);
    });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === 'draft' && report?.status === 'ready') {
      setReadyNudge(true);
    }
    prevStatusRef.current = report?.status;
  }, [report?.status]);

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

  const pdfCounts = useMemo(
    () => (view ? growReportPdfPreviewCounts(view) : { sections: 0, photos: 0 }),
    [view]
  );

  useLayoutEffect(() => {
    const raw = editor.title?.trim() || report?.title || g.title;
    const title = raw.length > 32 ? `${raw.slice(0, 32)}…` : raw;
    navigation.setOptions({ title });
  }, [navigation, editor.title, report?.title, g.title]);

  const persist = useCallback(async () => {
    if (!farmId || !reportId || !dirtyRef.current) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      autosavePausedRef.current = true;
      setSaveState('error');
      setSaveError(strings.dailyFocus.notSignedIn);
      return;
    }
    setSaveState('saving');
    setSaveError(null);
    try {
      await saveReportEditorLayer(supabase, farmId, reportId, editor);
      dirtyRef.current = false;
      autosavePausedRef.current = false;
      setSaveState('saved');
      skipHydrate.current = false;
      await queryClient.invalidateQueries({ queryKey: ['grow-report', farmId, reportId] });
    } catch (e: unknown) {
      autosavePausedRef.current = true;
      setSaveState('error');
      setSaveError(e instanceof Error ? e.message : g.saveFailed);
    }
  }, [editor, farmId, g.saveFailed, queryClient, reportId, strings.dailyFocus.notSignedIn, supabase]);

  useEffect(() => {
    if (!dirtyRef.current || autosavePausedRef.current) return;
    const t = setTimeout(() => void persist(), 1200);
    return () => clearTimeout(t);
  }, [editor, persist]);

  function patchEditor(patch: Partial<GrowReportEditorV1>) {
    dirtyRef.current = true;
    autosavePausedRef.current = false;
    skipHydrate.current = true;
    setSaveError(null);
    setSaveState('idle');
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
    setExportError(null);
    dirtyRef.current = true;
    await persist();
    const result = await shareGrowReportPdf({
      supabase,
      report: { ...report, editor_json: editor as unknown as Record<string, unknown> },
      farmId,
      locale: locale,
      shareDialogTitle: g.shareDialogTitle,
      htmlLabels: {
        introduction: g.pdfLabelIntroduction,
        closing: g.pdfLabelClosing,
        photos: g.pdfLabelPhotos,
        footerBrand: 'Growlog',
      },
    });
    if (result === 'shared') return;
    if (result === 'draft') setExportError(g.exportStillDraft);
    else if (result === 'sharing_unavailable') setExportError(g.exportSharingUnavailable);
    else setExportError(g.exportFailed);
  }

  const blocks: ReportBlock[] = useMemo(() => {
    if (!report || !isReportJsonV1(report.report_json)) return [];
    return report.report_json.blocks;
  }, [report]);

  const eventNoteItems = useMemo(() => {
    const out: { eventId: string; summary: string; at?: string }[] = [];
    for (const b of blocks) {
      if (b.kind !== 'timeline_highlights' && b.kind !== 'anomalies') continue;
      if (editor.hiddenBlocks.includes(blockNoteKey(b.kind))) continue;
      for (const item of b.items) {
        if (item.eventId) {
          out.push({
            eventId: item.eventId,
            summary: item.summary,
            at: 'at' in item && typeof item.at === 'string' ? item.at : undefined,
          });
        }
      }
    }
    return out.slice(0, 24);
  }, [blocks, editor.hiddenBlocks]);

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.failedText}>{strings.commonMobile.error}</Text>
      </View>
    );
  }

  const editorBlocks = blocks.filter((b) => b.kind !== 'photos');
  const photosHidden = editor.hiddenBlocks.includes(blockNoteKey('photos'));
  const photoBlock = blocks.find(
    (b): b is Extract<ReportBlock, { kind: 'photos' }> => b.kind === 'photos'
  );

  const saveLabel =
    saveState === 'saving' ? g.saving : saveState === 'saved' ? g.saved : g.save;

  return (
    <View style={styles.screen}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {view?.periodLabel ? <Text style={styles.metaLine}>{view.periodLabel}</Text> : null}

      {showCoach ? (
        <View style={styles.coachCard}>
          <Text style={styles.coachText}>{g.editorCoach}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setShowCoach(false);
              void dismissGrowReportCoach();
            }}
          >
            <Text style={styles.coachDismiss}>{g.editorCoachDismiss}</Text>
          </Pressable>
        </View>
      ) : null}

      {report.status === 'draft' ? (
        <Text style={styles.banner}>{g.generating}</Text>
      ) : null}
      {readyNudge && report.status === 'ready' ? (
        <Text style={styles.readyBanner}>{g.editorReady}</Text>
      ) : null}
      {report.status === 'failed' ? (
        <Text style={styles.failedBanner}>
          {g.reportFailed}
          {report.summary_text ? `\n${report.summary_text.slice(0, 280)}` : ''}
        </Text>
      ) : null}

      {audience === 'public_community' ? (
        <Text style={styles.publicNote}>{g.publicSanitizeNote}</Text>
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
        placeholder={g.introPlaceholder}
        placeholderTextColor={colors.placeholder}
      />

      {editorBlocks.map((block, idx) => {
        const sectionHidden = editor.hiddenBlocks.includes(blockNoteKey(block.kind));
        return (
        <View
          key={`${block.kind}-${idx}`}
          style={[styles.block, sectionHidden && styles.blockHidden]}
        >
          <View style={styles.blockHead}>
            <Text style={styles.blockTitle}>
              {'title' in block && typeof block.title === 'string' ? block.title : block.kind}
            </Text>
            <Switch
              value={!sectionHidden}
              onValueChange={() => toggleHiddenBlock(block.kind)}
              accessibilityLabel={sectionHidden ? g.showSection : g.sectionInPdf}
            />
          </View>
          {block.kind === 'sensor_trends' && !sectionHidden
            ? block.series.map((s) => (
                <ChartCard
                  key={s.metricCode}
                  title={s.metricLabel}
                  empty={s.points.length ? undefined : strings.timelineScreen.charts.climateEmpty}
                >
                  {s.points.length ? (
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
                  ) : null}
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
        );
      })}

      {eventNoteItems.length > 0 ? (
        <>
          <Text style={styles.label}>{g.eventNotesSection}</Text>
          {eventNoteItems.map((item) => (
            <View key={item.eventId} style={styles.eventRow}>
              {item.at ? <Text style={styles.eventAt}>{item.at.slice(0, 10)}</Text> : null}
              <Text style={styles.eventSummary} numberOfLines={2}>
                {item.summary}
              </Text>
              <TextInput
                style={styles.noteInput}
                value={editor.itemNotes[eventNoteKey(item.eventId)] ?? ''}
                onChangeText={(t) =>
                  patchEditor({
                    itemNotes: { ...editor.itemNotes, [eventNoteKey(item.eventId)]: t },
                  })
                }
                placeholder={`${g.eventNote} · ${g.authorLabel}`}
                placeholderTextColor={colors.placeholder}
              />
            </View>
          ))}
        </>
      ) : null}

      {photoBlock ? (
        <View style={[styles.block, photosHidden && styles.blockHidden]}>
          <View style={styles.blockHead}>
            <Text style={styles.blockTitle}>{photoBlock.title}</Text>
            <Switch
              value={!photosHidden}
              onValueChange={() => toggleHiddenBlock('photos')}
              accessibilityLabel={photosHidden ? g.showSection : g.sectionInPdf}
            />
          </View>
          <TextInput
            style={styles.noteInput}
            value={editor.blockNotes[blockNoteKey('photos')] ?? ''}
            onChangeText={(t) =>
              patchEditor({
                blockNotes: { ...editor.blockNotes, [blockNoteKey('photos')]: t },
              })
            }
            placeholder={g.sectionNote}
            placeholderTextColor={colors.placeholder}
          />
        </View>
      ) : null}

      {!photosHidden &&
        photoBlock?.items.map((p) => {
          const photoHidden = editor.hiddenPhotos.includes(p.mediaAssetId);
          return (
        <View
          key={p.mediaAssetId}
          style={[styles.photoRow, photoHidden && styles.blockHidden]}
        >
          <View style={styles.photoHead}>
            <ReportPhotoThumb mediaAssetId={p.mediaAssetId} />
            <Switch
              value={!photoHidden}
              onValueChange={() => toggleHiddenPhoto(p.mediaAssetId)}
            />
          </View>
          <TextInput
            style={styles.noteInput}
            value={
              editor.photoCaptions[mediaNoteKey(p.mediaAssetId)] ??
              editor.photoCaptions[p.mediaAssetId] ??
              p.caption ??
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
          );
        })}

      <Text style={styles.label}>{g.outro}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={editor.outro ?? ''}
        onChangeText={(t) => patchEditor({ outro: t })}
        multiline
        placeholder={g.outroPlaceholder}
        placeholderTextColor={colors.placeholder}
      />

      {report.status === 'ready' ? (
        <Text style={styles.pdfPreview}>
          {g.pdfPreview
            .replace('{sections}', String(pdfCounts.sections))
            .replace('{photos}', String(pdfCounts.photos))}
        </Text>
      ) : null}
    </ScrollView>

    <View style={styles.footer}>
      {(saveError || exportError) && (
        <Text style={styles.footerError} numberOfLines={3}>
          {saveError ?? exportError}
        </Text>
      )}
      <Pressable
        style={[
          styles.btn,
          styles.exportBtn,
          (pdfBusy || report.status === 'draft' || report.status === 'failed') && styles.btnDisabled,
        ]}
        onPress={() => void onPdf(exportPdf)}
        disabled={pdfBusy || report.status === 'draft' || report.status === 'failed'}
      >
        {pdfBusy ? (
          <View style={styles.btnBusy}>
            <ActivityIndicator color={colors.primaryText} />
            <Text style={styles.btnText}>{g.exportingPdf}</Text>
          </View>
        ) : (
          <Text style={styles.btnText}>{g.exportPdf}</Text>
        )}
      </Pressable>
      <Pressable
        style={styles.saveLink}
        onPress={() => {
          if (!dirtyRef.current && saveState !== 'saving') {
            setSaveState('saved');
            return;
          }
          autosavePausedRef.current = false;
          dirtyRef.current = true;
          void persist();
        }}
      >
        <Text style={[styles.saveLinkText, saveState === 'saved' && styles.saveLinkTextSaved]}>
          {saveLabel}
        </Text>
      </Pressable>
    </View>
    </View>
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
    screen: { flex: 1, backgroundColor: c.screen },
    scroll: { flex: 1 },
    container: { padding: 16, paddingBottom: 24, gap: 10 },
    metaLine: { fontSize: 13, color: c.textMuted, marginBottom: 4 },
    coachCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 12,
      gap: 8,
    },
    coachText: { fontSize: 14, lineHeight: 20, color: c.text },
    coachDismiss: { fontSize: 14, fontWeight: '600', color: c.primary },
    readyBanner: {
      padding: 12,
      backgroundColor: c.card,
      borderRadius: 8,
      color: c.textMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      fontSize: 14,
      lineHeight: 20,
    },
    publicNote: { fontSize: 13, lineHeight: 18, color: c.textMuted, fontStyle: 'italic' },
    pdfPreview: { fontSize: 13, color: c.sectionLabel, textAlign: 'center', marginTop: 4 },
    btnBusy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eventAt: { fontSize: 11, fontWeight: '600', color: c.sectionLabel },
    banner: {
      padding: 12,
      backgroundColor: c.warningSurface,
      borderRadius: 8,
      color: c.text,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    failedBanner: {
      padding: 12,
      backgroundColor: c.warningSurface,
      borderRadius: 8,
      color: c.dangerText,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    failedText: { color: c.dangerText, marginTop: 8 },
    blockHidden: { opacity: 0.45 },
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
    footer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.card,
      gap: 8,
    },
    footerError: { fontSize: 12, lineHeight: 16, color: c.dangerText, textAlign: 'center' },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    exportBtn: { width: '100%' },
    btnDisabled: { opacity: 0.55 },
    btnText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    saveLink: { alignItems: 'center', paddingVertical: 6 },
    saveLinkText: { color: c.primary, fontWeight: '600', fontSize: 14 },
    saveLinkTextSaved: { color: c.textMuted, fontWeight: '500' },
  });
}
