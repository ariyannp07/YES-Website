import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDates, calendarICS, googleCalendarURL, eventInstant } from '../../public/calendar/calendar-links.js';
const event = { id: 'stable-id', event_name: 'Dinner', start_date: '2026-10-14', end_date: '2026-10-14', start_time: '19:00', end_time: '21:00', location: 'New Haven', description: 'Join us', rsvp_url: '' };
const tz = 'America/New_York';
test('calendar exports use Eastern offsets, overnight dates, and DST transitions', () => {
  assert.deepEqual(calendarDates(event, tz), { start: '20261014T230000Z', end: '20261015T010000Z', allDay: false });
  assert.equal(calendarDates({ ...event, start_date: '2026-12-14', end_date: '2026-12-14' }, tz).start, '20261215T000000Z');
  assert.equal(eventInstant('2026-11-01', '01:30', tz).toISOString(), '2026-11-01T05:30:00.000Z');
  assert.throws(() => eventInstant('2026-03-08', '02:30', tz), /does not exist/);
});
test('all-day exports use an exclusive end date, including multi-day and year boundaries', () => {
  const dates = calendarDates({ ...event, start_date: '2026-12-30', end_date: '2026-12-31', start_time: '', end_time: '' }, tz);
  assert.deepEqual(dates, { start: '20261230', end: '20270101', allDay: true });
  assert.match(calendarICS({ ...event, start_time: '', end_time: '' }, tz), /DTEND;VALUE=DATE:20261015/);
});
test('unknown end times have an explicit one-hour default; nonpositive duration is rejected', () => {
  const unknown = { ...event, end_time: '' };
  assert.equal(calendarDates(unknown, tz).end, '20261015T000000Z');
  assert.match(calendarICS(unknown, tz), /End time not set/);
  assert.throws(() => calendarDates({ ...event, end_time: '18:00' }, tz));
});
test('ICS escapes injection and folds Unicode lines by octets without corrupting characters', () => {
  const text = '你好 😀,'.repeat(35);
  const ics = calendarICS({ ...event, event_name: 'A, B; C\\D\r\nBEGIN:VEVENT', description: text }, tz);
  assert.ok(ics.endsWith('\r\n'));
  assert.equal(ics.split('\r\n').filter(line => line === 'BEGIN:VEVENT').length, 1);
  assert.match(ics, /SUMMARY:A\\, B\\; C\\\\D\\nBEGIN:VEVENT/);
  assert.ok(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.ok(ics.replace(/\r\n /g, '').includes(text.replaceAll(',', '\\,')));
  assert.match(ics, /UID:stable-id@calendar.yesyale.org/);
});
test('Google links encode names, details, location and dates without OAuth calendar permissions', () => {
  const url = new URL(googleCalendarURL({ ...event, event_name: 'A & B #1', location: 'A/B?C' }, tz));
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.searchParams.get('text'), 'A & B #1');
  assert.equal(url.searchParams.get('dates'), '20261014T230000Z/20261015T010000Z');
  assert.equal(url.searchParams.get('ctz'), tz);
  assert.equal(url.searchParams.get('location'), 'A/B?C');
});
