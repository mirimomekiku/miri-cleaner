import { useCallback, useRef, useState } from "react";

interface RunOptions {
  /** Format the caught error for display; defaults to the raw error message. */
  formatError?: (e: unknown) => string;
}

export interface UseAsyncActionResult {
  /** Runs `action`, tracking pending/error state and remembering it as the
   * retry target. Clears any prior error immediately, matching the
   * hand-rolled `setErrorMessage(null)` views did at the top of every
   * handler before this hook existed. */
  run: (action: () => Promise<void>, options?: RunOptions) => Promise<void>;
  /** Re-runs whichever action was passed to the most recent `run()` call. */
  retry: () => void;
  dismiss: () => void;
  isPending: boolean;
  error: string | null;
}

/**
 * Centralizes the "one error banner per view" pattern used across the app:
 * every catch block used to hand-write `setErrorMessage(...)`, and the log
 * drawer (closed by default) was the only other trace of a failure. A view
 * with several async handlers (scan, clean, install, uninstall, ...) shares
 * a single instance of this hook and a single <ErrorBanner>, exactly as the
 * pre-existing `errorMessage` local state did -- `run()` doesn't add a
 * pending flag per action because most views already drive their own
 * per-action booleans (isScanning, isCleaning, isProcessing, ...) from the
 * surrounding Zustand store or local state for mascot moods and button
 * labels; this hook only owns the error and the retry target.
 */
export function useAsyncAction(): UseAsyncActionResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef<(() => void) | null>(null);

  const run = useCallback(async (action: () => Promise<void>, options?: RunOptions) => {
    retryRef.current = () => {
      void run(action, options);
    };
    setIsPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      const message = options?.formatError
        ? options.formatError(e)
        : e instanceof Error
        ? e.message
        : String(e);
      setError(message);
    } finally {
      setIsPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    retryRef.current?.();
  }, []);

  const dismiss = useCallback(() => setError(null), []);

  return { run, retry, dismiss, isPending, error };
}
