import { useEffect, useRef, useCallback } from 'react';

export const useAutoRefresh = (refetchCallback, intervalMs = 15000) => {
  const intervalRef = useRef(null);
  const callbackRef = useRef(refetchCallback);

  // Keep the latest callback
  useEffect(() => {
    callbackRef.current = refetchCallback;
  }, [refetchCallback]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      callbackRef.current?.();
    }, intervalMs);
  }, [intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Refetch when window gets focus (user switches tab and comes back)
    const onFocus = () => {
      callbackRef.current?.();
    };

    // Refetch when page becomes visible again
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current?.();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    startPolling();

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return { startPolling, stopPolling };
};
