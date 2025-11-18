import { useEffect, useRef } from "react";

/**
 * Custom hook to prevent double execution in React StrictMode
 * Use this instead of useEffect when you want to avoid double execution in development
 */
export function useStrictModeEffect(effect, deps) {
  const hasRun = useRef(false);
  const cleanupRef = useRef(null);

  useEffect(() => {
    // Skip the first run in StrictMode (it's the cleanup run)
    if (!hasRun.current) {
      hasRun.current = true;
      return;
    }

    // Run the effect
    const cleanup = effect();
    if (cleanup) {
      cleanupRef.current = cleanup;
    }

    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      // Reset for next mount
      hasRun.current = false;
    };
  }, deps);
}

export default useStrictModeEffect;
