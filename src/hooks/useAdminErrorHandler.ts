import { useCallback, useMemo } from "react";
import { logAdminError, logAdminWarning, logAdminInfo } from "@/lib/adminErrorLogger";

export function useAdminErrorHandler(componentName: string) {
  const logError = useCallback(
    (action: string, error: Error | unknown, context?: Record<string, unknown>) => {
      logAdminError(componentName, action, error, context);
    },
    [componentName]
  );

  const logWarning = useCallback(
    (message: string, context?: Record<string, unknown>) => {
      logAdminWarning(componentName, message, context);
    },
    [componentName]
  );

  const logInfo = useCallback(
    (message: string, context?: Record<string, unknown>) => {
      logAdminInfo(componentName, message, context);
    },
    [componentName]
  );

  // Wrapper for async operations with automatic error logging
  const withErrorLogging = useCallback(
    <T,>(action: string, fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> => {
      return fn().catch((error) => {
        logError(action, error, context);
        throw error;
      });
    },
    [logError]
  );

  // Safe async executor that catches and logs errors without rethrowing
  const safeExecute = useCallback(
    async <T,>(
      action: string,
      fn: () => Promise<T>,
      context?: Record<string, unknown>
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        logError(action, error, context);
        return null;
      }
    },
    [logError]
  );

  return useMemo(
    () => ({
      logError,
      logWarning,
      logInfo,
      withErrorLogging,
      safeExecute,
    }),
    [logError, logWarning, logInfo, withErrorLogging, safeExecute]
  );
}
