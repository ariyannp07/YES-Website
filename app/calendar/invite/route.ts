import type { NextRequest } from "next/server";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";
import { readInvitationToken } from "@/lib/calendar/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  let valid = false;
  try { valid = Boolean(readInvitationToken(token)); } catch { /* Configuration unavailable. */ }
  const error = request.nextUrl.searchParams.get("error");
  const message = !valid ? "This invitation link is invalid."
    : error === "denied" ? "This invitation is unavailable or has already been claimed by another account."
    : error === "unavailable" ? "Unable to verify this invitation. Please try again."
    : error === "signin" ? "Sign-in failed. Please try again."
    : "Sign in to accept your invitation. It gives you access to this event only.";
  // Token syntax is strictly checked before it can be included in an HTML attribute.
  const action = valid ? `<a class="rsvp-link" href="/api/calendar/auth/start?invite=${encodeURIComponent(token!)}" target="_top">Continue with Google <span aria-hidden="true">↗</span></a>` : "";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Event invitation — YES</title><link rel="stylesheet" href="/calendar/styles.css"></head><body><div class="calendar-shell"><header class="masthead"><a class="wordmark" aria-label="YES home" href="/"><span class="yes-logo" aria-hidden="true"><span class="yes-logo-bars"></span><span class="yes-logo-center"></span></span></a><span class="masthead-note">Event invitation</span></header><main class="login-panel"><h1>You're invited</h1><p class="login-message" role="status">${message}</p>${action}<p class="detail-audience">One guest. The first account to accept claims the invitation.</p></main></div></body></html>`, {
    status: valid ? 200 : 400,
    headers: { ...PRIVATE_HEADERS, "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; script-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN" },
  });
}
