import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { createNetworkClient } = await import(`data:text/javascript;base64,${Buffer.from(readFileSync(new URL('../../public/opportunities/network-cache.js', import.meta.url))).toString('base64')}`);
const key = 'a'.repeat(64), otherKey = 'b'.repeat(64);
const data = { firms: [{ id: 'firm' }], startups: [{ id: 'company' }], connections: [] };
function fixture() {
  const f = { value: null, time: 10000, key, denied: false, offline: false, calls: [] };
  f.storage = {
    read: async () => f.value,
    write: async value => { f.value = value; },
    clear: async () => { f.value = null; },
  };
  f.fetcher = async (url, options) => {
    f.calls.push(url);
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-store');
    if (f.offline) throw new Error('offline');
    if (f.denied) return new Response(null, { status: 204 });
    return url.endsWith('/access') ? Response.json({ key: f.key })
      : Response.json(data, { headers: { 'X-YES-Network-Key': f.key } });
  };
  f.client = () => createNetworkClient({ fetcher: f.fetcher, storage: f.storage, now: () => f.time });
  return f;
}
test('preloads on a public page, then reuses the browser snapshot after authenticated document navigation', async () => {
  const f = fixture();
  assert.deepEqual(await f.client().load(), data); assert.equal(f.calls.length, 2);
  assert.deepEqual(await f.client().load(key), data);
  assert.equal(f.calls.length, 2, 'fresh member HTML should not wait on another API call');
  assert.deepEqual(await f.client().load(), data);
  assert.equal(f.calls.length, 3, 'later visits must recheck membership before cache use');
});
test('revoked and guest access cannot reuse a saved roster, and clears it', async () => {
  const f = fixture(); await f.client().load(); f.denied = true;
  await assert.rejects(f.client().load(), error => error.status === 403);
  assert.equal(f.value, null);
  assert.equal(f.calls.filter(url => !url.endsWith('/access')).length, 1);
});
test('a different sign-in and expired or future-dated snapshots require a fresh roster', async () => {
  const f = fixture(); await f.client().load();
  f.key = otherKey; await f.client().load(otherKey);
  assert.equal(f.value.key, otherKey); assert.equal(f.calls.length, 3);
  f.time += 120000; await f.client().load(otherKey); assert.equal(f.calls.length, 4);
  f.time -= 1; await f.client().load(otherKey); assert.equal(f.calls.length, 5);
});
test('does not fall back to saved data when access checks fail', async () => {
  const f = fixture(); await f.client().load(); f.offline = true;
  await assert.rejects(f.client().load(), /offline/);
});
test('blocked browser storage does not prevent an authenticated network load', async () => {
  const f = fixture();
  f.storage = Object.fromEntries(['read', 'write', 'clear'].map(k => [k, async () => { throw new Error('quota'); }]));
  assert.deepEqual(await f.client().load(key), data);
});
test('simultaneous preload and pane opening share one request', async () => {
  const f = fixture(), client = f.client();
  const [first, second] = await Promise.all([client.load(key), client.load(key)]);
  assert.deepEqual(first, second); assert.equal(f.calls.length, 1);
});
test('sign-out during a fetch prevents the private data being saved or displayed', async () => {
  const f = fixture(); let resolve;
  f.fetcher = () => new Promise(r => { resolve = r; });
  const client = f.client(), pending = client.load(key);
  while (!resolve) await new Promise(r => setImmediate(r));
  await client.clear();
  resolve(Response.json(data, { headers: { 'X-YES-Network-Key': key } }));
  await assert.rejects(pending, error => error.status === 403); assert.equal(f.value, null);
});
