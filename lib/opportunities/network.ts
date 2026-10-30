import "server-only";
const text = (v: unknown) => typeof v === "string" ? v.trim().slice(0, 5000) : "";
export function safeURL(value: unknown, image = false) {
  const raw = text(value);
  if (image && /^\/vc\/[a-z0-9.-]+\.(svg|png|webp)$/i.test(raw)) return raw;
  try { const u = new URL(raw); return u.protocol === "https:" && !u.username && !u.password ? u.href : ""; } catch { return ""; }
}
function records(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Invalid network response");
  const rows = value.filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  const counts = new Map<string, number>();
  rows.forEach(r => counts.set(text(r.id), (counts.get(text(r.id)) || 0) + 1));
  return rows.filter(r => r.status === "Published" && /^[a-z0-9][a-z0-9_-]{0,99}$/i.test(text(r.id)) && counts.get(text(r.id)) === 1);
}
function fields(row: Record<string, unknown>, names: string[]) {
  return Object.fromEntries(names.map(name => [name, name.endsWith("_url") || ["website", "relationship_source"].includes(name)
    ? safeURL(row[name], name === "logo_url") : text(row[name])])) as Record<string, string>;
}
function relationshipEvidence(value: unknown) {
  const raw = text(value);
  // Board-only evidence references stay in the private Sheet, never in the API.
  if (/^internal:\s*\S/i.test(raw)) return { relationship_source: "", relationship_verification: "YES records" };
  const url = safeURL(raw);
  if (!url) return null;
  const host = new URL(url).hostname.toLowerCase();
  if (["mail.google.com", "docs.google.com", "drive.google.com", "notes.granola.ai", "app.granola.ai", "chatgpt.com"].includes(host)) {
    return { relationship_source: "", relationship_verification: "YES records" };
  }
  return { relationship_source: url, relationship_verification: "Public record" };
}
export function projectNetwork(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid network response");
  const raw = input as Record<string, unknown>;
  const firms: Record<string, string>[] = records(raw.firms).flatMap(r => {
    const evidence = relationshipEvidence(r.relationship_source);
    if (!text(r.name) || !evidence || !safeURL(r.source_url)) return [];
    return [{ ...fields(r, ["id", "name", "description", "focus", "location", "website", "logo_url", "relationship", "source_url", "verified_on"]), ...evidence }];
  });
  const aliases = new Map<string, string>();
  const domains = new Map<string, Record<string, string>>();
  const companies: Record<string, string>[] = [];
  records(raw.startups).filter(r => text(r.name) && safeURL(r.website) && safeURL(r.source_url)).forEach(r => {
    const row = fields(r, ["id", "name", "description", "sector", "location", "stage", "website", "careers_url", "logo_url", "source_url", "verified_on"]);
    const domain = new URL(row.website).hostname.toLowerCase().replace(/^www\./, "");
    const existing = domains.get(domain);
    if (existing) { aliases.set(row.id, existing.id); return; }
    domains.set(domain, row); aliases.set(row.id, row.id); companies.push(row);
  });
  const seen = new Set<string>();
  const connections = records(raw.connections).map(r => fields(r, ["id", "firm_id", "startup_id", "type", "relationship", "source_url", "verified_on"]))
    .map<Record<string, string>>(r => ({ ...r, startup_id: aliases.get(r.startup_id) || "" }))
    .filter(r => {
      if (!r.startup_id || !r.source_url) return false;
      if (r.type === "Portfolio" ? !firms.some(f => f.id === r.firm_id) : r.type !== "Direct" || !!r.firm_id) return false;
      const key = `${r.startup_id}:${r.type}:${r.firm_id}`;
      if (seen.has(key)) return false; seen.add(key); return true;
    });
  const startups = companies.filter(c => connections.some(r => r.startup_id === c.id));
  return { firms, startups, connections };
}
