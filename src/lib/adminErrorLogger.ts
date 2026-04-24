import { captureError } from "@/lib/sentry";

export interface AdminErrorLog {
  component: string;
  action: string;
  error: Error | unknown;
  context?: Record<string, unknown>;
  timestamp: string;
}

// In-memory log store for debugging (last 50 errors)
const errorLogs: AdminErrorLog[] = [];
const MAX_LOGS = 50;

export function logAdminError(
  component: string,
  action: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorLog: AdminErrorLog = {
    component,
    action,
    error,
    context,
    timestamp: new Date().toISOString(),
  };

  // Store in memory
  errorLogs.unshift(errorLog);
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.pop();
  }

  // Console logging with structured format (DEV only — production routes via Sentry)
  if (import.meta.env.DEV) {
    console.group(`🔴 Admin Error: ${component}`);
    console.error("Action:", action);
    console.error("Error:", error);
    if (context) {
      console.error("Context:", context);
    }
    console.error("Timestamp:", errorLog.timestamp);
    console.groupEnd();
  }

  // Report to Sentry
  const errorObj = error instanceof Error ? error : new Error(String(error));
  captureError(errorObj, {
    panel: "admin",
    extra: {
      component,
      action,
      ...context,
    },
  });
}

export function logAdminWarning(
  component: string,
  message: string,
  context?: Record<string, unknown>
): void {
  if (import.meta.env.DEV) {
    console.warn(`⚠️ Admin Warning [${component}]:`, message, context || "");
  }
}

export function logAdminInfo(
  component: string,
  message: string,
  context?: Record<string, unknown>
): void {
  if (import.meta.env.DEV) {
    console.info(`ℹ️ Admin Info [${component}]:`, message, context || "");
  }
}

export function getRecentErrors(): AdminErrorLog[] {
  return [...errorLogs];
}

export function clearErrorLogs(): void {
  errorLogs.length = 0;
}

// Hook-friendly error handler creator
export function createErrorHandler(component: string) {
  return {
    logError: (action: string, error: Error | unknown, context?: Record<string, unknown>) =>
      logAdminError(component, action, error, context),
    logWarning: (message: string, context?: Record<string, unknown>) =>
      logAdminWarning(component, message, context),
    logInfo: (message: string, context?: Record<string, unknown>) =>
      logAdminInfo(component, message, context),
  };
}
