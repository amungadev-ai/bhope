import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { createPoller } from './polling';

export function useLiveRefresh(
  task: (signal: AbortSignal) => Promise<boolean | void>,
  {
    enabled = true,
    intervalMs = 20000,
    maxAttempts,
    onError,
    onLimit,
  }: {
    enabled?: boolean;
    intervalMs?: number;
    maxAttempts?: number;
    onError?: (error: unknown) => void;
    onLimit?: () => void;
  } = {},
) {
  const callbacks = useRef({ onError, onLimit });
  useEffect(() => {
    callbacks.current = { onError, onLimit };
  }, [onError, onLimit]);
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const poller = createPoller({
        task,
        intervalMs,
        maxAttempts,
        onError: (error) => callbacks.current.onError?.(error),
        onLimit: () => callbacks.current.onLimit?.(),
      });
      if (AppState.currentState === 'active' || AppState.currentState === null) poller.resume();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') poller.resume();
        else poller.pause();
      });
      return () => {
        subscription.remove();
        poller.dispose();
      };
    }, [task, enabled, intervalMs, maxAttempts]),
  );
}
