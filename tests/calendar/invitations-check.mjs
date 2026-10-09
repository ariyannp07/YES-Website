import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../../docs/calendar/Code.gs', import.meta.url), 'utf8');
const secret = 'test-backend-secret-at-least-32-characters';
const firstId = 'a'.repeat(32), secondId = 'b'.repeat(32);
function backend() {
  let locked = false, lockCount = 0, unavailableLock = false;
  const tables = new Map();
  function sheet(name, values) {
    const store = { values };
    store.getDataRange = () => ({ getValues: () => structuredClone(store.values) });
    store.setFrozenRows = () => {};
    store.appendRow = row => { assert.ok(locked, 'invitations must be locked'); store.values.push(row.map(value => typeof value === 'string' && value.startsWith("'") ? value.slice(1) : value)); };
    store.getRange = (r, c, rows, cols) => ({
      getValues: () => Array.from({ length: rows }, (_, i) => store.values[r - 1 + i].slice(c - 1, c - 1 + cols)),
      setValues: values => {
        assert.ok(locked, 'writes must hold a script-wide lock');
        values.forEach((row, i) => { store.values[r - 1 + i] ||= []; row.forEach((value, j) => { store.values[r - 1 + i][c - 1 + j] = typeof value === 'string' && value.startsWith("'") ? value.slice(1) : value; }); });
      },
    });
    tables.set(name, store);return store;
  }
  const spreadsheet = {
    getSheetByName: name => tables.get(name), insertSheet: name => sheet(name, []),
    getSpreadsheetTimeZone: () => 'America/New_York',
  };
  const context = {
    console: { error() {}, warn() {} },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-08T16:00:00Z'])); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: name => name === 'SPREADSHEET_ID' ? 'sheet' : secret }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    SpreadsheetApp: { openById: () => spreadsheet, flush: () => { assert.ok(locked); } },
    LockService: { getScriptLock: () => ({ waitLock() { if (unavailableLock) throw new Error('busy'); assert.equal(locked, false); locked = true; lockCount++; }, hasLock: () => locked, releaseLock() { locked = false; } }) },
    Utilities: { formatDate: (date, timeZone, pattern) => {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
      const get = type => parts.find(part => part.type === type).value;
      return pattern === 'yyyy-MM-dd' ? `${get('year')}-${get('month')}-${get('day')}` : `${get('hour')}:${get('minute')}`;
    } },
  };
  vm.createContext(context);vm.runInContext(source, context);
  const headers = Array.from(vm.runInContext('CALENDAR_CONFIG.HEADERS', context));
  const events = [
    { id: 'one', event_name: 'Dinner', start_date: '2026-10-14', start_time: '19:00', end_time: '21:00', status: 'Published', visibility: 'YES' },
    { id: 'two', event_name: 'Other event', start_date: '2026-10-16', status: 'Published', visibility: 'YES' },
    { id: 'board', event_name: 'Private', start_date: '2026-10-14', status: 'Published', visibility: 'Board Only' },
    { id: 'past', event_name: 'Past', start_date: '2026-10-01', status: 'Published', visibility: 'YES' },
  ];
  sheet('Events', [headers, ...events.map(row => headers.map(h => row[h] ?? ''))]);
  sheet('Access', [['email', 'enabled'], ['member@yale.edu', true]]);
  const call = (action, fields = {}) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ secret, action, ...fields }) } }).text);
  return { call, tables, headers, blockLock() { unavailableLock = true; }, get lockCount() { return lockCount; } };
}
const create = api => api.call('invite_create', { email: 'member@yale.edu', eventId: 'one', id: firstId });
const claim = (api, email = 'guest@gmail.com') => api.call('invite_claim', { email, id: firstId });
test('one durable invitation per member/event, retries reuse it, and only one verified guest can claim', () => {
  const api = backend();
  assert.deepEqual(create(api), { id: firstId, claimed: false });
  assert.deepEqual(api.call('invite_create', { email: 'MEMBER@Yale.edu', eventId: 'one', id: secondId }), { id: firstId, claimed: false });
  assert.equal(api.tables.get('Invitations').values.length, 2);
  assert.deepEqual(claim(api), { eventId: 'one' });
  assert.deepEqual(claim(api), { eventId: 'one' });
  assert.deepEqual(claim(api, 'second@gmail.com'), { error: 'invite_claimed' });
  assert.deepEqual(create(api), { id: firstId, claimed: true });
  assert.equal(api.lockCount, 6);
  assert.deepEqual(api.call('guest_access', { email: 'guest@gmail.com' }), { eventIds: ['one'] });
  assert.deepEqual(api.call('access', { email: 'guest@gmail.com' }), { allowed: false });
});
test('guests cannot invite others, invite themselves, or claim invented IDs', () => {
  const api = backend();create(api);
  assert.deepEqual(api.call('invite_create', { email: 'guest@gmail.com', eventId: 'one', id: secondId }), { error: 'members_only' });
  assert.deepEqual(claim(api, 'member@yale.edu'), { error: 'self_invite' });
  assert.deepEqual(api.call('invite_claim', { email: 'guest@gmail.com', id: secondId }), { error: 'invite_unavailable' });
});
test('private, past, missing and duplicate event IDs cannot create invitations', () => {
  const api = backend();
  for (const eventId of ['board', 'past', '', 'missing'])
    assert.deepEqual(api.call('invite_create', { email: 'member@yale.edu', eventId, id: firstId }), { error: 'event_unavailable' });
  api.tables.get('Events').values.push([...api.tables.get('Events').values[1]]);
  assert.deepEqual(create(api), { error: 'event_unavailable' });
});
test('disabling a grant or its inviter immediately revokes guest access and cannot free a second slot', () => {
  const api = backend();create(api);claim(api);
  api.tables.get('Access').values[1][1] = false;
  assert.deepEqual(api.call('guest_access', { email: 'guest@gmail.com' }), { eventIds: [] });
  assert.deepEqual(claim(api), { error: 'invite_unavailable' });
  api.tables.get('Access').values[1][1] = true;
  api.tables.get('Invitations').values[1][6] = false;
  assert.deepEqual(api.call('guest_access', { email: 'guest@gmail.com' }), { eventIds: [] });
  assert.deepEqual(create(api), { error: 'invite_disabled' });
});
test('unpublishing, restricting or ending an event revokes its guest grants', () => {
  const api = backend();create(api);claim(api);
  const row = api.tables.get('Events').values[1];
  row[api.headers.indexOf('visibility')] = 'Board Only';
  assert.deepEqual(api.call('guest_access', { email: 'guest@gmail.com' }), { eventIds: [] });
  row[api.headers.indexOf('visibility')] = 'YES';row[api.headers.indexOf('status')] = 'Planning';
  assert.deepEqual(api.call('guest_access', { email: 'guest@gmail.com' }), { eventIds: [] });
  row[api.headers.indexOf('status')] = 'Published';row[api.headers.indexOf('start_date')] = '2026-10-01';
  assert.deepEqual(api.call('guest_access', { email: 'guest@gmail.com' }), { eventIds: [] });
});
test('invitation data stays private, and corrupted headers or unavailable locks fail closed', () => {
  const api = backend();create(api);claim(api);
  const guest = api.call('guest_access', { email: 'guest@gmail.com' });
  assert.deepEqual(Object.keys(guest), ['eventIds']);
  assert.ok(!JSON.stringify(api.call('events')).includes('guest@gmail.com'));
  api.blockLock();
  assert.deepEqual(create(api), { error: 'invitation_service_unavailable' });
  api.tables.get('Invitations').values[0][0] = 'broken';
  assert.deepEqual(api.call('guest_access', { email: 'guest@gmail.com' }), { error: 'invitation_service_unavailable' });
});
