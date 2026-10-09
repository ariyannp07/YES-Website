import { randomBytes, createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  authConfig,
  backendConfig,
  cookieName,
  PRIVATE_HEADERS,
} from "@/lib/calendar/config";
import { OAUTH_SECONDS, signToken } from "@/lib/calendar/tokens";

import { readInvitationToken } from "@/lib/calendar/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request?: NextRequest) {
  try {
    const config = authConfig();
    backendConfig();
    const invite = request?.nextUrl.searchParams.get("invite");
    const inviteId = readInvitationToken(invite || null);
    if (invite && !inviteId) throw new Error("Invalid invitation.");
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callback,
      response_type: "code",
      scope: "openid email",
      state,
      nonce,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    const response = NextResponse.redirect(url, 303);
    Object.entries(PRIVATE_HEADERS).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    response.cookies.set(
      cookieName("oauth"),
      await signToken(
        { state, nonce, verifier, ...(inviteId ? { inviteId } : {}) },
        config.secret,
        "oauth",
        OAUTH_SECONDS,
      ),
      {
        httpOnly: true,
        secure: config.secure,
        sameSite: "lax",
        path: "/",
        maxAge: OAUTH_SECONDS,
      },
    );
    return response;
  } catch {
    return new NextResponse(null, {
      status: 303,
      headers: {
        ...PRIVATE_HEADERS,
        Location: "/calendar/sign-in?error=unavailable",
      },
    });
  }
}
