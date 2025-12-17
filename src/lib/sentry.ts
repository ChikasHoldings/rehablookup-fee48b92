import * as Sentry from "@sentry/react";

export const setSentryUser = (user: {
  id: string;
  email?: string;
  role?: "admin" | "provider";
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};

export const captureError = (
  error: Error,
  context?: {
    panel?: "admin" | "provider";
    page?: string;
    extra?: Record<string, unknown>;
  }
) => {
  Sentry.captureException(error, {
    tags: {
      panel: context?.panel,
      page: context?.page,
    },
    extra: context?.extra,
  });
};

// Breadcrumb helpers for tracking user actions
export const addNavigationBreadcrumb = (from: string, to: string) => {
  Sentry.addBreadcrumb({
    category: "navigation",
    message: `Navigated from ${from} to ${to}`,
    level: "info",
    data: { from, to },
  });
};

export const addClickBreadcrumb = (element: string, details?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    category: "ui.click",
    message: `Clicked: ${element}`,
    level: "info",
    data: details,
  });
};

export const addApiCallBreadcrumb = (
  endpoint: string,
  method: string,
  status?: number,
  error?: string
) => {
  Sentry.addBreadcrumb({
    category: "api",
    message: `${method} ${endpoint}`,
    level: error ? "error" : "info",
    data: { endpoint, method, status, error },
  });
};

export const addFormBreadcrumb = (formName: string, action: "submit" | "validation_error", details?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    category: "form",
    message: `${formName}: ${action}`,
    level: action === "validation_error" ? "warning" : "info",
    data: details,
  });
};
