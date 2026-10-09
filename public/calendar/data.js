export const JOB_POSTINGS = "Job Postings";
export function isJobPosting(event) {
  return /^job postings?$/i.test(String(event?.event_type || "").trim());
}
export function selectFeed(events, type = "All") {
  return events.filter(event => type === JOB_POSTINGS
    ? isJobPosting(event)
    : !isJobPosting(event) && (type === "All" || event.event_type === type));
}

// Civil dates stay in the event's timezone, regardless of the visitor's timezone.
export const PUBLIC_VISIBILITIES = ["Public", "YES", "Common Room"];
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
export function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");
}
export function addDays(date, count) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + count);
  return parsed.toISOString().slice(0, 10);
}
export function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function normalizeEvents(rows) {
  if (!Array.isArray(rows))
    throw new Error("The API must return an events array.");
  const events = [];
  rows.forEach((row, index) => {
    if (
      !row ||
      row.status !== "Published" ||
      !PUBLIC_VISIBILITIES.includes(row.visibility)
    )
      return;
    const name = String(row.event_name || "").trim();
    if (!name) return;
    if (
      !validDate(row.start_date) ||
      (row.end_date && !validDate(row.end_date)) ||
      (row.start_time && !validTime(row.start_time)) ||
      (row.end_time && !validTime(row.end_time)) ||
      (row.end_time && !row.start_time)
    ) {
      console.warn(
        "[YES calendar] Skipping event with invalid date or time at data index",
        index,
      );
      return;
    }
    const startTime = row.start_time || "";
    const endTime = startTime ? row.end_time || "" : "";
    let endDate = row.end_date || row.start_date;
    // A lower end time with no end date means the following morning.
    if (!row.end_date && endTime && endTime < startTime)
      endDate = addDays(endDate, 1);
    if (
      endDate < row.start_date ||
      (endDate === row.start_date && endTime && endTime < startTime)
    ) {
      console.warn(
        "[YES calendar] Skipping backwards date range at data index",
        index,
      );
      return;
    }
    events.push({
      key: `event-${index}`,
      id: String(row.id || ""),
      event_name: name,
      event_type: String(row.event_type || "Other").trim() || "Other",
      start_date: row.start_date,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      location: String(row.location || "").trim(),
      description: String(row.description || "").trim(),
      visibility: row.visibility,
      featured:
        row.featured === true || String(row.featured).toUpperCase() === "TRUE",
      rsvp_url: safeURL(row.rsvp_url),
      image_url: safeURL(row.image_url),
    });
  });
  return events.sort(
    (a, b) =>
      `${a.start_date}T${a.start_time}`.localeCompare(
        `${b.start_date}T${b.start_time}`,
      ) || a.event_name.localeCompare(b.event_name),
  );
}
export function zonedNow(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}
export function isUpcoming(event, now) {
  // Without an end time, retain an event through its final calendar day.
  return (
    event.end_date > now.date ||
    (event.end_date === now.date &&
      (!event.end_time || event.end_time >= now.time))
  );
}
export function occursOn(event, date) {
  // Midnight is exclusive for timed events; all-day end dates are inclusive.
  const lastDay =
    event.end_time === "00:00" && event.end_date > event.start_date
      ? addDays(event.end_date, -1)
      : event.end_date;
  return date >= event.start_date && date <= lastDay;
}
export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}
export function dateRange(event) {
  const first = event.start_date,
    last = event.end_date;
  if (first === last) return formatDate(first, { year: "numeric" });
  if (first.slice(0, 7) === last.slice(0, 7))
    return `${formatDate(first)}–${Number(last.slice(8))}, ${first.slice(0, 4)}`;
  return `${formatDate(first, first.slice(0, 4) !== last.slice(0, 4) ? { year: "numeric" } : {})} – ${formatDate(last, { year: "numeric" })}`;
}
export function formatTime(time) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
export function timeRange(event) {
  if (!event.start_time) return "All day";
  if (!event.end_time)
    return `${formatTime(event.start_time)}${event.end_date !== event.start_date ? " start" : ""}`;
  if (event.end_date !== event.start_date)
    return `${formatDate(event.start_date, { month: "short" })}, ${formatTime(event.start_time)} – ${formatDate(event.end_date, { month: "short" })}, ${formatTime(event.end_time)}`;
  let start = formatTime(event.start_time),
    end = formatTime(event.end_time);
  if (start.slice(-2) === end.slice(-2)) start = start.slice(0, -3);
  return `${start}–${end}`;
}
export function monthCells(month) {
  const start = `${month}-01`;
  const leading = new Date(`${start}T12:00:00Z`).getUTCDay();
  const [year, number] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((leading + days) / 7) * 7 }, (_, i) =>
    addDays(start, i - leading),
  );
}
export async function loadEvents(url, signal) {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    credentials: "same-origin",
    redirect: "follow",
  });
  if ([401, 403].includes(response.status)) {
    const error = new Error("Calendar access could not be verified.");
    error.name = "CalendarAccessError";
    throw error;
  }
  if (!response.ok)
    throw new Error(`Calendar request failed (${response.status}).`);
  const payload = await response.json();
  return parseEvents(payload);
}
export function parseEvents(payload) {
  if (payload.error) throw new Error(String(payload.error));
  if (!payload.timezone)
    throw new Error("Calendar API is missing its timezone.");
  zonedNow(payload.timezone); // Validate the timezone at the API boundary.
  return {
    events: normalizeEvents(payload.events),
    timezone: payload.timezone,
    canInvite: payload.canInvite === true,
  };
}
