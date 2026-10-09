import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const issuer = "yes-calendar";
export const SESSION_SECONDS = 8 * 60 * 60;
export const OAUTH_SECONDS = 10 * 60;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

export async function signToken(
  payload: JWTPayload,
  secret: string,
  purpose: "session" | "oauth",
  seconds: number,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(purpose)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(new TextEncoder().encode(secret));
}

export async function readToken(
  token: string | undefined,
  secret: string,
  purpose: "session" | "oauth",
) {
  if (!token || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        issuer,
        audience: purpose,
        requiredClaims: ["exp", "iat"],
      },
    );
    return payload;
  } catch {
    return null;
  }
}

export function googleIdentity(payload: JWTPayload) {
  const email = normalizeEmail(payload.email);
  // Google is authoritative for Gmail and managed Workspace addresses only.
  if (
    !email ||
    payload.email_verified !== true ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    (!email.endsWith("@gmail.com") &&
      (typeof payload.hd !== "string" || !payload.hd))
  )
    return null;
  return { email, sub: payload.sub };
}
