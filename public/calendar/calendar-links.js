import { addDays } from './data.js';

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function wallParts(instant, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
// Derive the offsets either side of a DST transition, then verify the wall time.
// For the repeated fall hour, consistently choose its first occurrence.
export function eventInstant(date, time, timezone) {
  const wall = `${date}T${time}:00`;
  const target = Date.parse(`${wall}Z`);
  const offsets = [-86400000, 0, 86400000].map(delta => {
    const instant = target + delta;
    return Date.parse(`${wallParts(new Date(instant), timezone)}Z`) - instant;
  });
  const matches = [...new Set(offsets)].map(offset => new Date(target - offset))
    .filter(instant => wallParts(instant, timezone) === wall)
    .sort((a, b) => a - b);
  if (!matches.length) throw new Error('This event time does not exist in its timezone.');
  return matches[0];
}
export function calendarDates(event, timezone) {
  if (!event.start_time) return {
    start: event.start_date.replaceAll('-', ''),
    end: addDays(event.end_date, 1).replaceAll('-', ''),
    allDay: true,
  };
  const start = eventInstant(event.start_date, event.start_time, timezone);
  const end = event.end_time
    ? eventInstant(event.end_date, event.end_time, timezone)
    : new Date(eventInstant(event.end_date, event.start_time, timezone).getTime() + 3600000);
  if (end <= start) throw new Error('The event needs an end time after its start.');
  return { start: utcStamp(start), end: utcStamp(end), allDay: false };
}
function description(event) {
  return [event.description, event.rsvp_url ? `RSVP: ${event.rsvp_url}` : '',
    event.start_time && !event.end_time ? 'End time not set. Adjust the calendar duration as needed.' : '']
    .filter(Boolean).join('\n\n');
}
export function googleCalendarURL(event, timezone) {
  const dates = calendarDates(event, timezone);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.event_name,
    dates: `${dates.start}/${dates.end}`, details: description(event),
    location: event.location || '', ctz: timezone });
  return `https://calendar.google.com/calendar/render?${params}`;
}
function escapeText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;').replace(/,/g, '\\,');
}
// RFC 5545: at most 75 UTF-8 octets per physical line, including continuation space.
function fold(line) {
  const encoder = new TextEncoder();
  let out = '', bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { out += '\r\n '; bytes = 1; }
    out += char; bytes += size;
  }
  return out;
}
export function calendarICS(event, timezone, stamp = new Date()) {
  const dates = calendarDates(event, timezone);
  const type = dates.allDay ? ';VALUE=DATE' : '';
  const uid = encodeURIComponent(event.id || `${event.start_date}-${event.event_name}`);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//YES Yale//Member Calendar//EN',
    'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${uid}@calendar.yesyale.org`,
    `DTSTAMP:${utcStamp(stamp)}`, `DTSTART${type}:${dates.start}`, `DTEND${type}:${dates.end}`,
    `SUMMARY:${escapeText(event.event_name)}`, `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(description(event))}`, 'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
}
