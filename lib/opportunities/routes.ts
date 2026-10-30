/** Keep event and network links through sign-in without allowing open redirects. */
export function opportunitiesReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 3000 || !value.startsWith("/")) return "/opportunities";
  try {
    const url = new URL(value, "https://return.invalid");
    if (url.origin !== "https://return.invalid" || !["/opportunities", "/calendar", "/calendar/index.html"].includes(url.pathname)) return "/opportunities";
    const params = new URLSearchParams();
    for (const key of ["view", "month", "type", "event", "section", "browse", "q", "sector", "location", "firm", "company"]) {
      const item = url.searchParams.get(key);
      if (item) params.set(key, item);
    }
    return `/opportunities${params.size ? `?${params}` : ""}`;
  } catch { return "/opportunities"; }
}
