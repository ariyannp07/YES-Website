import { loadNetwork } from './network-cache.js';

let timer;
async function warm() {
  clearTimeout(timer);
  if (document.hidden) return;
  try {
    await loadNetwork();
    // Keep the short-lived snapshot ready during longer visits, without
    // polling signed-out visitors or fetching while their tab is hidden.
    timer = setTimeout(warm, 120000);
  } catch { /* Preloading never interrupts the public website. */ }
}
timer = setTimeout(warm, 1000);
document.addEventListener('visibilitychange', () => {
  clearTimeout(timer);
  if (!document.hidden) timer = setTimeout(warm, 1000);
});
