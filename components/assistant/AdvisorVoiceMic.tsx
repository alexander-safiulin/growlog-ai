'use client';

import { AdvisorVoiceLogConfirm } from '@/components/assistant/AdvisorVoiceLogConfirm';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { routeAdvisorTranscript } from '@/lib/assistant/voice-intent-router';
import { speakAdvisorAnswer } from '@/lib/assistant/speak-answer-web';
import { arrayBufferToBase64 } from '@/lib/voice/buffer-to-base64';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

const MAX_MS = 120_000;
const ADVISOR_CONVERSATION_KEY = 'growlog_advisor_conversation_id';

function getOrCreateConversationId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    let id = sessionStorage.getItem(ADVISOR_CONVERSATION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(ADVISOR_CONVERSATION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

type AskResponse = {
  body: string;
  error?: string;
  detail?: string;
};

type Props = {
  disabled?: boolean;
  onAskResult: (userText: string, response: AskResponse) => void;
  onError: (message: string) => void;
  onVoiceUserTurn: (text: string) => void;
};

export function AdvisorVoiceMic({ disabled, onAskResult, onError, onVoiceUserTurn }: Props) {
  const { t, locale } = useTranslation();
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const runTranscript = useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text || !farmId) return;
      onVoiceUserTurn(text);
      setLogMessage(null);

      const route = routeAdvisorTranscript(text);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        onError(t('advisor.noSession'));
        return;
      }

      if (route === 'log_extract') {
        setLogMessage(text);
        return;
      }

      const conversationId = getOrCreateConversationId();

      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          farmId,
          cycleId: cycle?.id ?? null,
          scopeId: primaryScope?.id ?? null,
          conversationId,
          locale,
        }),
      });
      const data = (await res.json()) as AskResponse;
      if (!res.ok) {
        onError(data.detail || data.error || t('advisor.errorStatus', { status: res.status }));
        return;
      }
      onAskResult(text, data);
      void speakAdvisorAnswer(token, data.body);
    },
    [cycle?.id, farmId, locale, onAskResult, onError, onVoiceUserTurn, primaryScope?.id, supabase, t]
  );

  const runPipeline = useCallback(
    async (blob: Blob) => {
      setProcessing(true);
      try {
        const buf = await blob.arrayBuffer();
        const audioBase64 = arrayBufferToBase64(buf);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error(t('voice.noSession'));

        const trRes = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            audioBase64,
            mimeType: blob.type || 'audio/webm',
          }),
        });
        const tr = (await trRes.json()) as { text?: string; error?: string };
        if (!trRes.ok) throw new Error(tr.error || 'transcribe failed');
        const text = tr.text?.trim() ?? '';
        if (!text) throw new Error('Empty transcript');
        await runTranscript(text);
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : t('common.network'));
      } finally {
        setProcessing(false);
      }
    },
    [onError, runTranscript, supabase, t]
  );

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
      return;
    }
    stopTracks();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, [stopTracks]);

  async function startRecording() {
    if (disabled || processing) return;
    setLogMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stopTracks();
        mediaRecorderRef.current = null;
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        chunksRef.current = [];
        void runPipeline(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      timerRef.current = setTimeout(() => stopRecording(), MAX_MS);
    } catch {
      onError(t('voice.micDenied'));
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={recording ? 'destructive' : 'outline'}
        size="sm"
        disabled={disabled || processing}
        onClick={() => (recording ? stopRecording() : void startRecording())}
      >
        {recording ? (
          <>
            <Square className="mr-2 h-4 w-4" />
            {t('voice.stopAndParse')}
          </>
        ) : processing ? (
          t('voice.processing')
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            {t('advisor.voiceAsk')}
          </>
        )}
      </Button>
      {logMessage ? <AdvisorVoiceLogConfirm message={logMessage} /> : null}
    </div>
  );
}
