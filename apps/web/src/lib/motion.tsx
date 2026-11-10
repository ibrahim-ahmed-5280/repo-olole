import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';

/**
 * Combines the OS `prefers-reduced-motion` setting with the CMS "animations enabled" switch.
 * Motion components receive `reducedMotion="always"` when either asks for less motion,
 * and <html data-reduced-motion> disables CSS keyframes.
 */
const ReducedMotionContext = createContext(false);

function useOsReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export function MotionPreferenceProvider({ animationsEnabled, children }: { animationsEnabled: boolean; children: ReactNode }) {
  const os = useOsReducedMotion();
  const reduced = os || !animationsEnabled;
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
  }, [reduced]);
  return (
    <ReducedMotionContext.Provider value={reduced}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </ReducedMotionContext.Provider>
  );
}

export const useReducedMotionPref = () => useContext(ReducedMotionContext);
