export const normalized = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function selectNetwork(data, { kind = "startups", query = "", sector = "", location = "" } = {}) {
  const tokens = normalized(query).trim().split(/\s+/).filter(Boolean);
  return data[kind].filter(item => {
    const companyIds = kind === "firms" ? data.connections.filter(c => c.firm_id === item.id).map(c => c.startup_id) : [item.id];
    const companies = data.startups.filter(c => companyIds.includes(c.id));
    const firms = kind === "firms" ? [item] : data.firms.filter(f => data.connections.some(c => c.startup_id === item.id && c.firm_id === f.id));
    if (sector && !companies.some(c => c.sector === sector)) return false;
    if (location && item.location !== location && !(kind === "firms" && companies.some(c => c.location === location))) return false;
    const haystack = normalized([item.name, item.description, item.focus, item.sector, item.location, ...companies.map(c => c.name), ...firms.map(f => f.name)].join(" "));
    return tokens.every(token => haystack.includes(token));
  }).sort((a, b) => a.name.localeCompare(b.name));
}
