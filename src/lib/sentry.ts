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
