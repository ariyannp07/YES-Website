const MAX_AGE = 2 * 60 * 1000;
const validData = data => data && [data.firms, data.startups, data.connections].every(Array.isArray);
const validKey = key => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key);
const accessError = () => Object.assign(new Error('Member access required'), { status: 403 });

// IndexedDB fits the full directory without sessionStorage's small text quota.
// Storage is optional: blocked/quota-limited browsers use the authenticated API.
function stored(mode, action, value) {
  return new Promise(resolve => {
    let db, settled = false, result = null;
    const finish = value => {
      if (settled) return;
      settled = true; clearTimeout(timer); db?.close(); resolve(value);
    };
    const timer = setTimeout(() => finish(null), 1000);
    try {
      const open = indexedDB.open('yes-member-network', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('snapshot');
      open.onerror = open.onblocked = () => finish(null);
      open.onsuccess = () => {
        db = open.result;
        if (settled) { db.close(); return; }
        try {
          const tx = db.transaction('snapshot', mode), store = tx.objectStore('snapshot');
          const request = action === 'read' ? store.get('current')
            : action === 'write' ? store.put(value, 'current') : store.delete('current');
          request.onsuccess = () => { result = request.result ?? null; };
          tx.oncomplete = () => finish(result);
          tx.onerror = tx.onabort = () => finish(null);
        } catch { finish(null); }
      };
    } catch { finish(null); }
  });
}

export function createNetworkClient({ fetcher, storage, now = Date.now }) {
  let pending, generation = 0;
  async function clear() { generation++; await storage.clear().catch(() => {}); }
  async function request(url) {
    const response = await fetcher(url, {
      credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000),
    });
    if ([204, 401, 403].includes(response.status)) { await clear(); throw accessError(); }
    if (!response.ok) throw new Error('Network unavailable');
    return response;
  }
  async function read(bootstrapKey) {
    const current = generation;
    // Only the freshly authenticated Opportunities HTML may provide a key.
    // All other pages and subsequent refreshes recheck membership first.
    const key = validKey(bootstrapKey) ? bootstrapKey
      : (await (await request('/api/opportunities/network/access')).json()).key;
    if (!validKey(key)) throw new Error('Invalid network session');
    const cached = await storage.read().catch(() => null);
    if (current !== generation) throw accessError();
    const age = now() - cached?.savedAt;
    if (cached?.key === key && age >= 0 && age < MAX_AGE && validData(cached.data)) return cached.data;
    await storage.clear().catch(() => {});
    const response = await request('/api/opportunities/network');
    const data = await response.json(), responseKey = response.headers.get('X-YES-Network-Key');
    if (current !== generation) throw accessError();
    if (!validData(data) || !validKey(responseKey)) throw new Error('Invalid network response');
    await storage.write({ key: responseKey, savedAt: now(), data }).catch(() => {});
    if (current !== generation) { await storage.clear().catch(() => {}); throw accessError(); }
    return data;
  }
  return {
    load(bootstrapKey) {
      if (!pending) pending = read(bootstrapKey).finally(() => { pending = null; });
      return pending;
    },
    clear,
  };
}

const client = createNetworkClient({
  fetcher: (...args) => fetch(...args),
  storage: {
    read: () => stored('readonly', 'read'),
    write: value => stored('readwrite', 'write', value),
    clear: () => stored('readwrite', 'clear'),
  },
});
export const loadNetwork = key => client.load(key);
export const clearNetworkCache = () => client.clear();
