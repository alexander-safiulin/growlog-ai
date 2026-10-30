import { transcribeRecordingFile } from '@/lib/transcribe-recording';
import { normalizeRecorderMeter } from '@/lib/voice-meter';
import { discardVoiceRecording, startVoiceRecording, stopVoiceRecording } from '@/lib/voice-recording';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_MS = 120_000;

export function useVoiceTranscription({
  supabase,
  enabled,
  language,
  onTranscript,
  onError,
}: {
  supabase: SupabaseClient;
  enabled: boolean;
  language?: string;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const startingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const languageRef = useRef(language);

  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;
  languageRef.current = language;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) void discardVoiceRecording(rec);
    };
  }, []);

  useEffect(() => {
    if (!recording) {
      setRecordingElapsedSec(0);
      setRecordingLevel(0);
      return;
    }
    const poll = setInterval(() => {
      const rec = recordingRef.current;
      if (!rec) return;
      const status = rec.getStatus();
      const nextSec = Math.floor(status.durationMillis / 1000);
      const nextLevel = normalizeRecorderMeter(status.metering);
      setRecordingElapsedSec((prev) => (prev === nextSec ? prev : nextSec));
      setRecordingLevel((prev) => (Math.abs(prev - nextLevel) < 0.02 ? prev : nextLevel));
    }, 80);
    return () => clearInterval(poll);
  }, [recording]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    startingRef.current = false;
    setRecording(false);
    if (!rec) return;

    const elapsedBefore = rec.getStatus().durationMillis;
    setProcessing(true);
    try {
      const uri = await stopVoiceRecording(rec);
      const elapsedAfter = rec.getStatus().durationMillis;
      const durationMs = Math.max(elapsedBefore || 0, elapsedAfter || 0);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      const text = await transcribeRecordingFile({
        uri,
        token,
        language: languageRef.current,
        durationMs,
      });
      onTranscriptRef.current(text);
    } catch (e: unknown) {
      onErrorRef.current(e instanceof Error ? e.message : 'Voice failed');
    } finally {
      setProcessing(false);
    }
  }, [supabase]);

  const startRecording = useCallback(async () => {
    if (!enabled || processing || recordingRef.current || startingRef.current) return;
    startingRef.current = true;
    let rec: AudioRecorder;
    try {
      rec = await startVoiceRecording();
    } catch (e: unknown) {
      startingRef.current = false;
      onErrorRef.current(e instanceof Error ? e.message : 'Microphone permission required');
      return;
    }
    if (!startingRef.current) {
      void discardVoiceRecording(rec);
      return;
    }
    recordingRef.current = rec;
    setRecording(true);
    timerRef.current = setTimeout(() => {
      void stopRecording();
    }, MAX_MS);
  }, [enabled, processing, stopRecording]);

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    startingRef.current = false;
    setRecording(false);
    if (!rec) return;
    await discardVoiceRecording(rec);
  }, []);

  const toggleRecording = useCallback(() => {
    if (recording) void stopRecording();
    else void startRecording();
  }, [recording, startRecording, stopRecording]);

  return {
    recording,
    processing,
    recordingElapsedSec,
    recordingLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,
  };
}
