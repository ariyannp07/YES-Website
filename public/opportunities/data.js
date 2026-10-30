export const normalized = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function selectNetwork(data, { kind = "startups", query = "", sector = "", location = "" } = {}) {
  const tokens = normalized(query).trim().split(/\s+/).filter(Boolean);
  const companyById = new Map(data.startups.map(c => [c.id, c]));
  const firmById = new Map(data.firms.map(f => [f.id, f]));
  const companiesByFirm = new Map(), firmsByCompany = new Map();
  for (const connection of data.connections) {
    const company = companyById.get(connection.startup_id), firm = firmById.get(connection.firm_id);
    if (!company || !firm) continue;
    if (!companiesByFirm.has(firm.id)) companiesByFirm.set(firm.id, []);
    if (!firmsByCompany.has(company.id)) firmsByCompany.set(company.id, []);
    companiesByFirm.get(firm.id).push(company); firmsByCompany.get(company.id).push(firm);
  }
  return data[kind].filter(item => {
    const companies = kind === "firms" ? companiesByFirm.get(item.id) || [] : [item];
    const firms = kind === "firms" ? [item] : firmsByCompany.get(item.id) || [];
    if (sector && !companies.some(c => c.sector === sector)) return false;
    if (location && item.location !== location && !(kind === "firms" && companies.some(c => c.location === location))) return false;
    const haystack = normalized([item.name, item.description, item.focus, item.sector, item.location, ...companies.map(c => c.name), ...firms.map(f => f.name)].join(" "));
    return tokens.every(token => haystack.includes(token));
  }).sort((a, b) => a.name.localeCompare(b.name));
}
