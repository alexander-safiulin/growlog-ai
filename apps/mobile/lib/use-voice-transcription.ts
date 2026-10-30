import { normalizeRecorderMeter } from '@/lib/voice-meter';
import { uriToBase64 } from '@/lib/uri-to-base64';
import { startVoiceRecording, stopVoiceRecording } from '@/lib/voice-recording';
import { transcribeVoice } from '@growlog/api-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_MS = 120_000;

export function useVoiceTranscription({
  supabase,
  enabled,
  onTranscript,
  onError,
}: {
  supabase: SupabaseClient;
  enabled: boolean;
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

  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void recordingRef.current?.stop();
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

    setProcessing(true);
    try {
      const uri = await stopVoiceRecording(rec);
      const base64 = await uriToBase64(uri);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');

      const tr = await transcribeVoice(token, { audioBase64: base64, mimeType: 'audio/m4a' });
      const text = tr.text?.trim() ?? '';
      if (!text) throw new Error('Empty transcript');
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
      void rec.stop();
      return;
    }
    recordingRef.current = rec;
    setRecording(true);
    timerRef.current = setTimeout(() => {
      void stopRecording();
    }, MAX_MS);
  }, [enabled, processing, stopRecording]);

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
    toggleRecording,
  };
}
