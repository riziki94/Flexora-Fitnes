import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { getServerRequest } from "~/lib/request-context";

/**
 * Extract a short summary of the User-Agent string (browser + OS).
 */
function summarizeUA(ua: string): string {
  if (!ua) return "unknown";
  // Keep it short — max ~120 chars
  const cleaned = ua.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 120) return cleaned;

  // Try to extract just browser + OS
  const parts: string[] = [];

  // Browser
  const browserMatch = cleaned.match(
    /(Firefox\/[\d.]+|Chrome\/[\d.]+|Safari\/[\d.]+|Edge\/[\d.]+|OPR\/[\d.]+)/i,
  );
  if (browserMatch) parts.push(browserMatch[1]);

  // OS
  const osMatch = cleaned.match(
    /(Windows NT [\d.]+|Mac OS X [\d_]+|Android [\d.]+|iPhone OS [\d_]+|Linux)/i,
  );
  if (osMatch) parts.push(osMatch[1]);

  // Mobile/Desktop
  if (/Mobile|Android.*Mobile/i.test(cleaned)) parts.push("Mobile");
  else if (/Tablet|iPad/i.test(cleaned)) parts.push("Tablet");

  const summary = parts.join(" ") || cleaned.slice(0, 120);
  return summary.slice(0, 120);
}

/**
 * Track a page view or custom event server-side.
 * Call this from client components via the exported server function.
 */
export const trackEvent = createServerFn()
  .handler(async (opts: { eventType: string; path: string }) => {
    const db = getDb();
    const request = getServerRequest();
    const ua = request?.headers?.get("user-agent") || "";
    const summary = summarizeUA(ua);

    db.query(
      `INSERT INTO analytics_events (event_type, path, user_agent) VALUES (?, ?, ?)`,
    ).run(opts.eventType, opts.path, summary);

    return { ok: true };
  });
