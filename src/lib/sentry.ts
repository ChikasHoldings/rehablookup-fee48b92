// Lazy Sentry helpers - Sentry is loaded dynamically to avoid 231KB in critical path

const getSentry = () => import("@sentry/react");

export const setSentryUser = (user: {
  id: string;
  email?: string;
  role?: "admin" | "provider";
}) => {
  getSentry().then((Sentry) => {
    Sentry.setUser({ id: user.id, email: user.email, role: user.role });
  }).catch(() => {});
};

export const clearSentryUser = () => {
  getSentry().then((Sentry) => {
    Sentry.setUser(null);
  }).catch(() => {});
};

export const captureError = (
  error: Error,
  context?: {
    panel?: "admin" | "provider" | "seeker";
    page?: string;
    extra?: Record<string, unknown>;
  }
) => {
  getSentry().then((Sentry) => {
    Sentry.captureException(error, {
      tags: { panel: context?.panel, page: context?.page },
      extra: context?.extra,
    });
  }).catch(() => {});
};

export const addNavigationBreadcrumb = (from: string, to: string) => {
  getSentry().then((Sentry) => {
    Sentry.addBreadcrumb({
      category: "navigation",
      message: `Navigated from ${from} to ${to}`,
      level: "info",
      data: { from, to },
    });
  }).catch(() => {});
};

export const addClickBreadcrumb = (element: string, details?: Record<string, unknown>) => {
  getSentry().then((Sentry) => {
    Sentry.addBreadcrumb({
      category: "ui.click",
      message: `Clicked: ${element}`,
      level: "info",
      data: details,
    });
  }).catch(() => {});
};

export const addApiCallBreadcrumb = (
  endpoint: string,
  method: string,
  status?: number,
  error?: string
) => {
  getSentry().then((Sentry) => {
    Sentry.addBreadcrumb({
      category: "api",
      message: `${method} ${endpoint}`,
      level: error ? "error" : "info",
      data: { endpoint, method, status, error },
    });
  }).catch(() => {});
};

export const addFormBreadcrumb = (formName: string, action: "submit" | "validation_error", details?: Record<string, unknown>) => {
  getSentry().then((Sentry) => {
    Sentry.addBreadcrumb({
      category: "form",
      message: `${formName}: ${action}`,
      level: action === "validation_error" ? "warning" : "info",
      data: details,
    });
  }).catch(() => {});
};
