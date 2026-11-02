import "server-only";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { authConfig, cookieName } from "@/lib/calendar/config";

// An opaque cache partition, never an authentication credential. Only issue
// this after a fresh member check; a new Google sign-in gets a different key.
export function networkBrowserKey(request: NextRequest) {
  const session = request.cookies.get(cookieName("session"))?.value;
  if (!session) throw new Error("Missing network session");
  return createHmac("sha256", authConfig().secret)
    .update("network-browser-v1:").update(session).digest("hex");
}
