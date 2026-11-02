import { selectNetwork } from './data.js';
import { loadNetwork, clearNetworkCache } from './network-cache.js';
const $ = id => document.getElementById(id);
const make = (tag, className = '', text = '') => { const n = document.createElement(tag); n.className = className; n.textContent = text; return n; };
const state = { data: null, loading: false, error: '', kind: 'startups', query: '', sector: '', location: '', limit: 48 };
let active = false, priorFocus, loadedAt = 0;
let bootstrapKey = document.documentElement.dataset.networkKey;
const member = document.documentElement.dataset.networkAccess === 'true';
function route() {
  const q = new URLSearchParams(location.search);
  active = member && q.get('section') === 'network';
  $('network-tab').hidden = !member;
  const skip = document.querySelector('.skip-link'); skip.href = active ? '#network-panel' : '#events'; skip.textContent = active ? 'Skip to network' : 'Skip to calendar';
  $('network-panel').hidden = !active; $('calendar-panel').hidden = active;
  for (const [id, selected] of [['network-tab', active], ['calendar-tab', !active]]) {
    if (selected) $(id).setAttribute('aria-current', 'page'); else $(id).removeAttribute('aria-current');
  }
  state.kind = q.get('browse') === 'firms' ? 'firms' : 'startups';
  state.query = q.get('q') || ''; state.sector = q.get('sector') || ''; state.location = q.get('location') || '';
  $('network-search').value = state.query;
  if (!active) { if ($('network-dialog').open) $('network-dialog').close(); return; }
  if ((!state.data || Date.now() - loadedAt >= 120000) && !state.loading) load(); else { render(); linkedProfile(); }
}
function updateURL(push = false) {
  const url = new URL(location.href); url.searchParams.set('section', 'network');
  for (const [key, value] of [['browse', state.kind === 'firms' ? 'firms' : ''], ['q', state.query], ['sector', state.sector], ['location', state.location]]) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  history[push ? 'pushState' : 'replaceState'](null, '', url);
}
for (const [id, network] of [['calendar-tab', false], ['network-tab', true]]) $(id).addEventListener('click', e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault(); const url = new URL(location.href);
  if (network) url.searchParams.set('section', 'network'); else url.searchParams.delete('section');
  url.searchParams.delete('firm'); url.searchParams.delete('company'); url.searchParams.delete('event');
  history.pushState(null, '', url); route();
});
function external(label, href, className = '') {
  const a = make('a', className, label + ' ↗');
  try { const u = new URL(href); if (u.protocol !== 'https:') return null; a.href = u.href; } catch { return null; }
  a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
}
function logo(item) {
  const box = make('span', 'network-logo', item.name.split(/\s+/).slice(0, 2).map(s => s[0]).join(''));
  if (item.logo_url) {
    const img = document.createElement('img'); img.src = item.logo_url; img.alt = ''; img.loading = 'lazy';
    const initials = box.textContent;
    img.addEventListener('error', () => { box.textContent = initials; }, { once: true });
    img.addEventListener('load', () => { box.replaceChildren(img); }, { once: true }); box.append(img);
  }
  return box;
}
function profileButton(item, kind, compact = false) {
  const button = make('button', compact ? 'connection-link' : 'network-card'); button.type = 'button';
  button.setAttribute('aria-label', `${item.name}. View ${kind === 'firms' ? 'firm' : 'company'} profile`);
  if (!compact) button.append(logo(item));
  const body = make('span', 'network-card-body'); body.append(make('strong', '', item.name));
  if (!compact) {
    body.append(make('span', 'network-description', item.description || 'Description not yet listed.'));
    body.append(make('span', 'network-meta', [kind === 'firms' ? item.focus : item.sector, item.location].filter(Boolean).join(' · ') || 'Details not yet listed'));
    if (kind === 'startups') {
      const paths = state.data.connections.filter(c => c.startup_id === item.id);
      const names = state.data.firms.filter(f => paths.some(c => c.firm_id === f.id)).map(f => f.name);
      body.append(make('span', 'network-connection', paths.some(c => c.type === 'Direct') ? 'Direct YES relationship' : `Via ${names.join(' · ')}`));
    } else {
      const count = new Set(state.data.connections.filter(c => c.firm_id === item.id).map(c => c.startup_id)).size;
      body.append(make('span', 'network-connection', count ? `${count} ${count === 1 ? 'company' : 'companies'} listed` : 'Portfolio not yet listed'));
    }
  }
  button.append(body, make('span', 'network-arrow', '↗'));
  button.addEventListener('click', () => openProfile(item, kind, true, button)); return button;
}
function options(id, values, label, selected) {
  const select = $(id); select.replaceChildren();
  const all = make('option', '', label); all.value = ''; select.append(all);
  for (const value of [...new Set(values.filter(Boolean))].sort()) { const option = make('option', '', value); option.value = value; select.append(option); }
  if (selected && !values.includes(selected)) { const option = make('option', '', selected); option.value = selected; select.append(option); }
  select.value = selected;
}
function render(reset = true) {
  if (reset) state.limit = 48;
  $('network-more').hidden = true;
  document.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)));
  $('network-list').setAttribute('aria-busy', String(state.loading));
  $('network-reset').hidden = !state.query && !state.sector && !state.location;
  $('network-retry').hidden = !state.error;
  $('network-status').dataset.state = state.loading ? 'loading' : state.error ? 'error' : 'empty';
  $('network-list').replaceChildren();
  if (!state.data) { $('network-count').textContent = ''; $('network-status').textContent = state.error || 'Loading the network…'; return; }
  options('sector-filter', state.data.startups.map(c => c.sector), 'All sectors', state.sector);
  options('location-filter', [...state.data.startups, ...(state.kind === 'firms' ? state.data.firms : [])].map(c => c.location), 'All locations', state.location);
  const rows = selectNetwork(state.data, state);
  $('network-count').textContent = `${rows.length} ${state.kind === 'firms' ? rows.length === 1 ? 'firm' : 'firms' : rows.length === 1 ? 'company' : 'companies'}`;
  $('network-status').textContent = rows.length ? '' : state.query || state.sector || state.location ? 'No matches. Try another search or clear your filters.' : 'The network is being added. Check back soon.';
  $('network-list').append(...rows.slice(0, state.limit).map(item => profileButton(item, state.kind)));
  $('network-more').hidden = rows.length <= state.limit;
  $('network-more').textContent = `Show more · ${Math.min(state.limit, rows.length)} of ${rows.length}`;
}
async function load() {
  if (state.loading || !member) return;
  state.loading = true; state.error = ''; render();
  const key = bootstrapKey; bootstrapKey = undefined;
  try {
    state.data = await loadNetwork(key); loadedAt = Date.now();
  } catch (error) {
    state.data = null; state.error = 'The network is temporarily unavailable. Please try again.';
    if ($('network-dialog').open) $('network-dialog').close(); $('network-detail').replaceChildren();
    if (error.status === 403 && active) location.replace('/opportunities/sign-in?error=denied');
  } finally { state.loading = false; render(); if (state.data && active) linkedProfile(); }
}
function detailFact(list, name, value) { const row = make('div'); row.append(make('dt', '', name), make('dd', '', value || 'Not yet listed')); list.append(row); }
function openProfile(item, kind, push = false, trigger) {
  if (trigger && !$('network-dialog').open) priorFocus = trigger;
  if (push) { const url = new URL(location.href); url.searchParams.delete('firm'); url.searchParams.delete('company'); url.searchParams.set(kind === 'firms' ? 'firm' : 'company', item.id); history.pushState(null, '', url); }
  $('network-detail-kind').textContent = kind === 'firms' ? 'Connected firm' : 'Company';
  const detail = $('network-detail'); detail.replaceChildren();
  const title = make('h2', '', item.name); title.id = 'network-detail-title';
  detail.append(logo(item), title, make('p', 'network-detail-description', item.description || 'Description not yet listed.'));
  const facts = make('dl', 'detail-facts');
  detailFact(facts, kind === 'firms' ? 'Focus' : 'Sector', kind === 'firms' ? item.focus : item.sector);
  detailFact(facts, 'Location', item.location);
  if (kind !== 'firms') detailFact(facts, 'Stage', item.stage);
  detail.append(facts);
  const links = make('div', 'network-links');
  const website = external('Website', item.website); if (website) links.append(website); else links.append(make('span', 'network-meta', 'Website not yet listed'));
  if (kind === 'startups') { const careers = external('Careers', item.careers_url); if (careers) links.append(careers); else links.append(make('span', 'network-meta', 'Careers link not yet listed')); }
  detail.append(links);
  const path = make('section', 'network-path'); path.append(make('h3', '', 'The YES connection'));
  if (kind === 'firms') {
    path.append(make('p', '', item.relationship || 'Relationship details not yet listed.'));
    const source = external('YES relationship record', item.relationship_source, 'source-link'); if (source) path.append(source);
    else if (item.relationship_verification === 'YES records') path.append(make('span', 'network-meta', 'Verified in YES records.'));
  } else {
    const connections = state.data.connections.filter(c => c.startup_id === item.id);
    for (const connection of connections) {
      const row = make('div', 'network-path-row');
      row.append(make('span', 'network-path-label', connection.type === 'Direct' ? 'Direct YES relationship' : connection.type === 'Program' ? 'Program alumni connection' : 'Potential introduction through investor'));
      const firm = state.data.firms.find(f => f.id === connection.firm_id);
      if (firm) row.append(profileButton(firm, 'firms', true));
      if (connection.relationship) row.append(make('p', '', connection.relationship));
      const source = external('Connection source', connection.source_url, 'source-link'); if (source) row.append(source);
      path.append(row);
    }
  }
  path.append(make('p', 'office-hours', 'Bring this up at Office Hours.'));
  if (kind === 'firms') path.append(make('p', 'network-meta', 'An investor connection does not guarantee an introduction.'));
  detail.append(path);
  if (kind === 'firms') {
    const connections = state.data.connections.filter(c => c.firm_id === item.id);
    const ids = new Set(connections.map(c => c.startup_id));
    const companies = state.data.startups.filter(c => ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
    const alumni = connections.length && connections.every(c => c.type === 'Program');
    const portfolio = make('section', 'network-portfolio'); portfolio.append(make('h3', '', alumni ? 'Alumni companies' : 'Portfolio companies'));
    let shown = 0;
    const more = make('button', 'network-more', 'Show more companies'); more.type = 'button';
    const appendCompanies = () => {
      const next = companies.slice(shown, shown + 24);
      more.before(...next.map(c => profileButton(c, 'startups', true))); shown += next.length;
      more.hidden = shown >= companies.length;
      more.textContent = `Show more companies · ${shown} of ${companies.length}`;
    };
    if (companies.length) { portfolio.append(more); appendCompanies(); more.addEventListener('click', appendCompanies); }
    if (!companies.length) portfolio.append(make('p', 'network-meta', 'Portfolio companies have not yet been verified for this directory.'));
    detail.append(portfolio);
  }
  const sources = make('div', 'network-sources'); const source = external('Official source', item.source_url, 'source-link'); if (source) sources.append(source);
  sources.append(make('span', 'network-meta', item.verified_on ? `Checked ${item.verified_on}` : 'Verification date not listed')); detail.append(sources);
  if (!$('network-dialog').open) $('network-dialog').showModal();
  $('network-dialog').scrollTop = 0;
  $('close-network').focus({ preventScroll: true });
}
function linkedProfile() {
  const q = new URLSearchParams(location.search); const kind = q.has('firm') ? 'firms' : 'startups'; const id = q.get('firm') || q.get('company');
  if (!id || !state.data || !active) { if ($('network-dialog').open) $('network-dialog').close(); return; }
  const item = state.data[kind].find(i => i.id === id);
  if (item) openProfile(item, kind); else { if ($('network-dialog').open) $('network-dialog').close(); $('network-status').textContent = 'This profile is no longer available.'; }
}
$('close-network').addEventListener('click', () => $('network-dialog').close());
$('network-dialog').addEventListener('click', event => {
  if (event.target !== $('network-dialog')) return;
  const bounds = $('network-dialog').getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('network-dialog').close();
});
$('network-dialog').addEventListener('close', () => {
  const url = new URL(location.href); url.searchParams.delete('firm'); url.searchParams.delete('company'); history.replaceState(null, '', url);
  (priorFocus?.isConnected ? priorFocus : $('network-tab')).focus({ preventScroll: true });
});
$('network-search').addEventListener('input', () => { state.query = $('network-search').value; updateURL(); render(); });
for (const [id, key] of [['sector-filter', 'sector'], ['location-filter', 'location']]) $(id).addEventListener('change', () => { state[key] = $(id).value; updateURL(); render(); });
for (const button of document.querySelectorAll('[data-kind]')) button.addEventListener('click', () => { state.kind = button.dataset.kind; updateURL(); render(); });
$('network-reset').addEventListener('click', () => { state.query = state.sector = state.location = ''; $('network-search').value = ''; updateURL(); render(); });
$('network-retry').addEventListener('click', load);
$('network-more').addEventListener('click', () => {
  const firstNew = state.limit; state.limit += 48; render(false);
  $('network-list').children[firstNew]?.focus({ preventScroll: true });
});
window.addEventListener('popstate', route);
document.addEventListener('visibilitychange', () => { if (!document.hidden && active) load(); });
setInterval(() => { if (!document.hidden && active) load(); }, 300000);
route();
// Loading the Calendar pane also prepares Our Network before the tab is opened.
if (member && !active) load();
const logoutForm = document.querySelector('form[action="/api/calendar/auth/logout"]');
logoutForm?.addEventListener('submit', event => {
  event.preventDefault();
  state.data = null;
  clearNetworkCache().finally(() => logoutForm.submit());
});
