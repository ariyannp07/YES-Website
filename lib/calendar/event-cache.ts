import "server-only";
import { createHash } from "node:crypto";
import { calendarBackend, projectEvents } from "./backend";
import { backendConfig } from "./config";

type Events = ReturnType<typeof projectEvents>;

// A short, strict server-only cache. Never cache identities, access decisions,
// guest grants, or errors; never return expired data when Sheets is unavailable.
export function createEventCache(load: () => Promise<Events>, now = Date.now) {
  let entry: { key: string; expires: number; value: Promise<Events> } | undefined;
  return (key: string) => {
    if (entry?.key === key && entry.expires > now()) return entry.value;
    const current = { key, expires: Infinity, value: Promise.resolve().then(load) };
    entry = current;
    current.value = current.value.then(value => {
      current.expires = now() + 30_000;
      return value;
    }, error => {
      if (entry === current) entry = undefined;
      throw error;
    });
    return current.value;
  };
}

const cachedEvents = createEventCache(async () => projectEvents(await calendarBackend("events")));

export function publishedEvents() {
  const config = backendConfig();
  const key = createHash("sha256").update(config.url).update(config.secret).digest("hex");
  return cachedEvents(key);
}
