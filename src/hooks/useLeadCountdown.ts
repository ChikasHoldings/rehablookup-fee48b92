import { useState, useEffect, useMemo } from "react";

const EXCLUSIVE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CountdownResult {
  /** Time remaining formatted as HH:MM:SS */
  formatted: string;
  /** Total seconds remaining (0 if expired) */
  totalSeconds: number;
  /** Whether the lead has expired */
  isExpired: boolean;
  /** Percentage of time elapsed (0-100) */
  percentElapsed: number;
  /** Urgency tier for styling */
  urgencyTier: "safe" | "warning" | "critical";
}

export function useLeadCountdown(createdAt: string): CountdownResult {
  const expiresAt = useMemo(
    () => new Date(createdAt).getTime() + EXCLUSIVE_WINDOW_MS,
    [createdAt]
  );

  const calcRemaining = () => Math.max(0, expiresAt - Date.now());
  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  const percentElapsed = Math.min(
    100,
    ((EXCLUSIVE_WINDOW_MS - remaining) / EXCLUSIVE_WINDOW_MS) * 100
  );

  const urgencyTier: CountdownResult["urgencyTier"] =
    totalSeconds <= 0
      ? "critical"
      : totalSeconds <= 4 * 3600
        ? "critical"
        : totalSeconds <= 12 * 3600
          ? "warning"
          : "safe";

  return {
    formatted,
    totalSeconds,
    isExpired: remaining <= 0,
    percentElapsed,
    urgencyTier,
  };
}
