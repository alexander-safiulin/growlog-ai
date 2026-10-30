import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type VisionCaptureValue = {
  eyeMode: boolean;
  setEyeMode: (active: boolean) => void;
  toggleEyeMode: () => void;
};

const VisionCaptureContext = createContext<VisionCaptureValue | null>(null);

export function VisionCaptureProvider({ children }: { children: ReactNode }) {
  const [eyeMode, setEyeMode] = useState(false);
  const toggleEyeMode = useCallback(() => {
    setEyeMode((on) => !on);
  }, []);

  const value = useMemo(
    () => ({
      eyeMode,
      setEyeMode,
      toggleEyeMode,
    }),
    [eyeMode, toggleEyeMode],
  );

  return <VisionCaptureContext.Provider value={value}>{children}</VisionCaptureContext.Provider>;
}

export function useVisionCapture() {
  const ctx = useContext(VisionCaptureContext);
  if (!ctx) throw new Error('useVisionCapture must be used within VisionCaptureProvider');
  return ctx;
}
