import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, cookieName, PRIVATE_HEADERS } from "@/lib/calendar/config";
import {
  googleIdentity,
  readToken,
  SESSION_SECONDS,
  signToken,
} from "@/lib/calendar/tokens";
import { isWhitelisted, guestEventIds, calendarBackend, CalendarBackendError } from "@/lib/calendar/backend";
import { invitationToken } from "@/lib/calendar/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  { timeoutDuration: 10000 },
);

export async function GET(request: NextRequest) {
  let response = new NextResponse(null, {
    status: 303,
    headers: { ...PRIVATE_HEADERS, Location: "/calendar/sign-in?error=signin" },
  });
  let inviteId: string | undefined;
  let signedIn = false;
  let secure = process.env.NODE_ENV === "production";
  try {
    const config = authConfig();
    secure = config.secure;
    const transaction = await readToken(
      request.cookies.get(cookieName("oauth"))?.value,
      config.secret,
      "oauth",
    );
    if (typeof transaction?.inviteId === "string" && /^[a-f0-9]{32}$/.test(transaction.inviteId))
      inviteId = transaction.inviteId;
    const code = request.nextUrl.searchParams.get("code");
    if (
      !transaction ||
      !code ||
      typeof transaction.state !== "string" ||
      typeof transaction.nonce !== "string" ||
      typeof transaction.verifier !== "string" ||
      transaction.state !== request.nextUrl.searchParams.get("state") ||
      request.nextUrl.searchParams.has("error")
    )
      return response;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.callback,
        grant_type: "authorization_code",
        code_verifier: transaction.verifier,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) return response;
    const tokens = await tokenResponse.json();
    if (typeof tokens.id_token !== "string") return response;
    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      algorithms: ["RS256"],
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.clientId,
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (payload.nonce !== transaction.nonce) return response;
    const identity = googleIdentity(payload);
    let eventId = "";
    if (identity && inviteId) {
      const claim = await calendarBackend("invite_claim", { id: inviteId, email: identity.email });
      if (typeof claim.eventId !== "string" || !claim.eventId) throw new Error("Invalid invitation response.");
      eventId = claim.eventId;
    }
    if (!identity || (!(await isWhitelisted(identity.email)) && !(await guestEventIds(identity.email)).length)) {
      response.headers.set("Location", "/calendar/sign-in?error=denied");
      return response;
    }
    response = new NextResponse(null, {
      status: 303,
      headers: { ...PRIVATE_HEADERS, Location: `/calendar/index.html${eventId ? `?event=${encodeURIComponent(eventId)}` : ""}` },
    });
    response.cookies.set(
      cookieName("session"),
      await signToken(identity, config.secret, "session", SESSION_SECONDS),
      {
        httpOnly: true,
        secure: config.secure,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_SECONDS,
      },
    );
    signedIn = true;
    return response;
  } catch (error) {
    console.error("[YES calendar] Sign-in could not be completed.");
    response.headers.set("Location", `/calendar/sign-in?error=${error instanceof CalendarBackendError &&
      ["invite_unavailable", "invite_claimed", "self_invite", "event_unavailable"].includes(error.code) ? "denied" : "unavailable"}`);
    return response;
  } finally {
    // Consume the browser's one-time transaction even for denial or malformed callbacks.
    response.cookies.set(cookieName("oauth"), "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure,
      sameSite: "lax",
    });
    if (!signedIn && inviteId) {
      const error = new URL(response.headers.get("Location")!, "https://local.invalid").searchParams.get("error") || "signin";
      response.headers.set("Location", `/calendar/invite?token=${encodeURIComponent(invitationToken(inviteId))}&error=${error}`);
    }
    if (!signedIn)
      response.cookies.set(cookieName("session"), "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure,
        sameSite: "lax",
      });
  }
}
