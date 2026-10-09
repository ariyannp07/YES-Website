import "server-only";
import { backendConfig } from "./config";
import { normalizeEmail } from "./tokens";

export class CalendarBackendError extends Error {
  constructor(public code: string) { super("Calendar backend rejected the request."); }
}
export async function calendarBackend(
  action: "access" | "events" | "guest_access" | "invite_create" | "invite_claim",
  input?: string | Record<string, string>,
) {
  const config = backendConfig();
  const response = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: config.secret,
      action,
      ...(typeof input === "string" ? { email: input } : input || {}),
    }),
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Calendar backend request failed.");
  const payload = await response.json();
  if (!payload || typeof payload !== "object")
    throw new Error("Invalid calendar backend response.");
  if (payload.error) throw new CalendarBackendError(String(payload.error));
  return payload;
}

export async function isWhitelisted(value: string): Promise<boolean> {
  const email = normalizeEmail(value);
  if (!email) return false;
  const provider = process.env.CALENDAR_WHITELIST_PROVIDER || "sheet";
  if (provider === "sheet") {
    const payload = await calendarBackend("access", email);
    if (typeof payload.allowed !== "boolean")
      throw new Error("Invalid access response.");
    return payload.allowed;
  }
  if (provider !== "airtable") throw new Error("Unknown whitelist provider.");
  const token = process.env.AIRTABLE_TOKEN;
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.CALENDAR_AIRTABLE_ACCESS_TABLE || "Calendar Access";
  if (!token || !base) throw new Error("Airtable access is not configured.");
  // Formula literals must be escaped independently of URL encoding.
  const literal = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const query = new URLSearchParams({
    filterByFormula: `AND(LOWER(TRIM({Email}))='${literal}',{Enabled}=1)`,
    maxRecords: "1",
  });
  query.append("fields[]", "Email");
  query.append("fields[]", "Enabled");
  const response = await fetch(
    `https://api.airtable.com/v0/${encodeURIComponent(base)}/${encodeURIComponent(table)}?${query}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("Whitelist lookup failed.");
  const payload = await response.json();
  if (!Array.isArray(payload.records))
    throw new Error("Invalid whitelist response.");
  return payload.records.some(
    (record: { fields?: { Email?: unknown; Enabled?: unknown } }) =>
      record.fields?.Enabled === true &&
      normalizeEmail(record.fields.Email) === email,
  );
}

const EVENT_FIELDS = [
  "id",
  "event_name",
  "event_type",
  "start_date",
  "start_time",
  "end_date",
  "end_time",
  "location",
  "status",
  "visibility",
  "description",
  "rsvp_url",
  "image_url",
  "featured",
] as const;
export function projectEvents(payload: unknown) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("timezone" in payload) ||
    typeof payload.timezone !== "string" ||
    !("events" in payload) ||
    !Array.isArray(payload.events)
  )
    throw new Error("Invalid events response.");
  new Intl.DateTimeFormat("en-US", { timeZone: payload.timezone }).format();
  const events = payload.events
    .filter(
      (event: Record<string, unknown>) =>
        event &&
        event.status === "Published" &&
        ["Public", "YES", "Common Room"].includes(String(event.visibility)) &&
        typeof event.event_name === "string" &&
        event.event_name.trim(),
    )
    .map((event: Record<string, unknown>) =>
      Object.fromEntries(EVENT_FIELDS.map((field) => [field, event[field]])),
    );
  return { timezone: payload.timezone, events };
}

export async function guestEventIds(email: string): Promise<string[]> {
  if ((process.env.CALENDAR_WHITELIST_PROVIDER || "sheet") !== "sheet") return [];
  try {
    const payload = await calendarBackend("guest_access", email);
    if (!Array.isArray(payload.eventIds) || !payload.eventIds.every((id: unknown) => typeof id === "string" && id.length > 0))
      throw new Error("Invalid guest access response.");
    return [...new Set<string>(payload.eventIds)];
  } catch (error) {
    // During rollout the previous backend supports members only.
    if (error instanceof CalendarBackendError && error.code === "invalid_action") return [];
    throw error;
  }
}
