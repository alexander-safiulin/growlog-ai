import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type VoiceHandlers = {
  start: () => void;
  stop: () => void;
  cancel: () => void;
  submitText: (text: string) => Promise<void>;
};

export type VoiceCapturePhase = {
  recording: boolean;
  processing: boolean;
  recordingLevel?: number;
  recordingElapsedSec?: number;
};

type VoiceCaptureValue = {
  recording: boolean;
  processing: boolean;
  recordingLevel: number;
  recordingElapsedSec: number;
  requestStart: () => void;
  requestStop: () => void;
  requestCancel: () => void;
  clearPending: () => void;
  submitText: (text: string) => Promise<void>;
  register: (handlers: VoiceHandlers) => () => void;
  setPhase: (phase: VoiceCapturePhase) => void;
};

const VoiceCaptureContext = createContext<VoiceCaptureValue | null>(null);

export function VoiceCaptureProvider({ children }: { children: ReactNode }) {
  const handlerStackRef = useRef<VoiceHandlers[]>([]);
  const handlersRef = useRef<VoiceHandlers | null>(null);
  const pendingStartRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);

  const register = useCallback((handlers: VoiceHandlers) => {
    handlerStackRef.current.push(handlers);
    handlersRef.current = handlers;
    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      handlers.start();
    }
    return () => {
      handlerStackRef.current = handlerStackRef.current.filter((h) => h !== handlers);
      const next = handlerStackRef.current[handlerStackRef.current.length - 1] ?? null;
      handlersRef.current = next;
      if (!next) {
        setRecording(false);
        setProcessing(false);
        setRecordingLevel(0);
        setRecordingElapsedSec(0);
      }
    };
  }, []);

  const requestStart = useCallback(() => {
    const start = handlersRef.current?.start;
    if (start) start();
    else pendingStartRef.current = true;
  }, []);

  const requestStop = useCallback(() => {
    pendingStartRef.current = false;
    handlersRef.current?.stop();
  }, []);

  const requestCancel = useCallback(() => {
    pendingStartRef.current = false;
    handlersRef.current?.cancel();
  }, []);

  const clearPending = useCallback(() => {
    pendingStartRef.current = false;
  }, []);

  const submitText = useCallback(async (text: string) => {
    const send = handlersRef.current?.submitText;
    if (!send) throw new Error('Log is not ready');
    await send(text);
  }, []);

  const setPhase = useCallback((phase: VoiceCapturePhase) => {
    setRecording(phase.recording);
    setProcessing(phase.processing);
    if (phase.recordingLevel !== undefined) setRecordingLevel(phase.recordingLevel);
    if (phase.recordingElapsedSec !== undefined) setRecordingElapsedSec(phase.recordingElapsedSec);
    if (!phase.recording) {
      setRecordingLevel(0);
      setRecordingElapsedSec(0);
    }
  }, []);

  const value = useMemo(
    () => ({
      recording,
      processing,
      recordingLevel,
      recordingElapsedSec,
      requestStart,
      requestStop,
      requestCancel,
      clearPending,
      submitText,
      register,
      setPhase,
    }),
    [
      recording,
      processing,
      recordingLevel,
      recordingElapsedSec,
      requestStart,
      requestStop,
      requestCancel,
      clearPending,
      submitText,
      register,
      setPhase,
    ]
  );

  return <VoiceCaptureContext.Provider value={value}>{children}</VoiceCaptureContext.Provider>;
}

export function useVoiceCapture(): VoiceCaptureValue {
  const ctx = useContext(VoiceCaptureContext);
  if (!ctx) throw new Error('useVoiceCapture outside VoiceCaptureProvider');
  return ctx;
}
