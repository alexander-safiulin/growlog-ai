import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type VoiceHandlers = {
  start: () => void;
  stop: () => void;
  submitText: (text: string) => Promise<void>;
};

type VoiceCaptureValue = {
  recording: boolean;
  processing: boolean;
  requestStart: () => void;
  requestStop: () => void;
  clearPending: () => void;
  submitText: (text: string) => Promise<void>;
  register: (handlers: VoiceHandlers) => () => void;
  setPhase: (phase: { recording: boolean; processing: boolean }) => void;
};

const VoiceCaptureContext = createContext<VoiceCaptureValue | null>(null);

export function VoiceCaptureProvider({ children }: { children: ReactNode }) {
  const handlerStackRef = useRef<VoiceHandlers[]>([]);
  const handlersRef = useRef<VoiceHandlers | null>(null);
  const pendingStartRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  const clearPending = useCallback(() => {
    pendingStartRef.current = false;
  }, []);

  const submitText = useCallback(async (text: string) => {
    const send = handlersRef.current?.submitText;
    if (!send) throw new Error('Log is not ready');
    await send(text);
  }, []);

  const setPhase = useCallback((phase: { recording: boolean; processing: boolean }) => {
    setRecording(phase.recording);
    setProcessing(phase.processing);
  }, []);

  const value = useMemo(
    () => ({
      recording,
      processing,
      requestStart,
      requestStop,
      clearPending,
      submitText,
      register,
      setPhase,
    }),
    [recording, processing, requestStart, requestStop, clearPending, submitText, register, setPhase]
  );

  return <VoiceCaptureContext.Provider value={value}>{children}</VoiceCaptureContext.Provider>;
}

export function useVoiceCapture(): VoiceCaptureValue {
  const ctx = useContext(VoiceCaptureContext);
  if (!ctx) throw new Error('useVoiceCapture outside VoiceCaptureProvider');
  return ctx;
}
