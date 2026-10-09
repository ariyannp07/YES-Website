import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { generateKeyPair, SignJWT } from "jose";
import { NextRequest } from "next/server";

const keys = vi.hoisted(() => ({ publicKey: null as CryptoKey | null }));
vi.mock("server-only", () => ({}));
vi.mock("jose", async (original) => {
  const actual = await original<typeof import("jose")>();
  return {
    ...actual,
    createRemoteJWKSet: () => async () => {
      if (!keys.publicKey) throw new Error("Test key missing");
      return keys.publicKey;
    },
  };
});
import { signToken, readToken, googleIdentity } from "./tokens";
import { isWhitelisted, projectEvents } from "./backend";
import { calendarAccess } from "./access";
import { GET as events } from "../../app/api/calendar/events/route";
import { GET as page } from "../../app/calendar/index.html/route";
import { GET as start } from "../../app/api/calendar/auth/start/route";
import { GET as callback } from "../../app/api/calendar/auth/callback/route";
import { POST as createInvite } from "../../app/api/calendar/invites/route";
import { GET as invitePage } from "../../app/calendar/invite/route";
import { invitationToken, readInvitationToken } from "./invitations";
import { POST as logout } from "../../app/api/calendar/auth/logout/route";

const secret = "test-session-secret-with-at-least-32-characters";
let privateKey: CryptoKey;
let googleToken = "";
let allowed = true;
let guestIds: string[] = [];
const sample = {
  timezone: "America/New_York",
  events: [
    {
      id: "one",
      event_name: "Member dinner",
      status: "Published",
      visibility: "YES",
      start_date: "2026-10-14",
      owner: "PRIVATE OWNER",
      notes: "PRIVATE NOTES",
    },
    { event_name: "Secret plan", status: "Planning", visibility: "Public" },
    {
      event_name: "Board meeting",
      status: "Published",
      visibility: "Board Only",
    },
  ],
};
function request(
  path: string,
  token?: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
) {
  return new NextRequest(`http://localhost:3000${path}`, {
    ...options,
    headers: {
      ...(token ? { Cookie: `yes_calendar_session=${token}` } : {}),
      ...options.headers,
    },
  });
}
async function session(email = "member@yale.edu") {
  return signToken({ email, sub: "google-member-id" }, secret, "session", 3600);
}
function installFetch() {
  return vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, options?: RequestInit) => {
      if (String(input).includes("oauth2.googleapis.com/token"))
        return Response.json({ id_token: googleToken });
      if (String(input).includes("api.airtable.com"))
        return Response.json({
          records: allowed
            ? [{ fields: { Email: "member@yale.edu", Enabled: true } }]
            : [],
        });
      const body = JSON.parse(String(options?.body));
      return Response.json(body.action === "access" ? { allowed }
        : body.action === "guest_access" ? { eventIds: guestIds }
        : body.action === "invite_create" ? { id: body.id, claimed: false }
        : body.action === "invite_claim" ? { eventId: "one" } : sample);
    }),
  );
}
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  keys.publicKey = pair.publicKey;
  privateKey = pair.privateKey;
});
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("CALENDAR_ORIGIN", "http://localhost:3000");
  vi.stubEnv("CALENDAR_GOOGLE_CLIENT_ID", "test-google-client");
  vi.stubEnv("CALENDAR_GOOGLE_CLIENT_SECRET", "test-google-client-secret");
  vi.stubEnv("CALENDAR_SESSION_SECRET", secret);
  vi.stubEnv(
    "CALENDAR_BACKEND_SECRET",
    "test-backend-secret-at-least-32-characters",
  );
  vi.stubEnv(
    "CALENDAR_APPS_SCRIPT_URL",
    "https://script.google.com/macros/s/test-deployment/exec",
  );
  vi.stubEnv("CALENDAR_WHITELIST_PROVIDER", "sheet");
  allowed = true;
  guestIds = [];
  googleToken = "";
  installFetch();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("signed sessions and verified Google identities", () => {
  it("rejects tampering, wrong key, expired tokens, and OAuth tokens used as sessions", async () => {
    const token = await session();
    expect((await readToken(token, secret, "session"))?.email).toBe(
      "member@yale.edu",
    );
    expect(
      await readToken(
        token.slice(0, -4) +
          (token.at(-4) === "a" ? "b" : "a") +
          token.slice(-3),
        secret,
        "session",
      ),
    ).toBeNull();
    expect(await readToken(token, "wrong-key", "session")).toBeNull();
    expect(
      await readToken(
        await signToken({ email: "member@yale.edu" }, secret, "session", -1),
        secret,
        "session",
      ),
    ).toBeNull();
    expect(
      await readToken(
        await signToken({ state: "x" }, secret, "oauth", 600),
        secret,
        "session",
      ),
    ).toBeNull();
  });
  it("requires Google-authoritative verified email and a subject", () => {
    expect(
      googleIdentity({
        email: "MEMBER@Yale.edu",
        email_verified: true,
        hd: "yale.edu",
        sub: "123",
      }),
    ).toEqual({ email: "member@yale.edu", sub: "123" });
    expect(
      googleIdentity({
        email: "member@gmail.com",
        email_verified: true,
        sub: "123",
      }),
    ).not.toBeNull();
    expect(
      googleIdentity({
        email: "member@yale.edu",
        email_verified: false,
        hd: "yale.edu",
        sub: "123",
      }),
    ).toBeNull();
    expect(
      googleIdentity({
        email: "member@example.com",
        email_verified: true,
        sub: "123",
      }),
    ).toBeNull();
  });
});

describe("page and event authorization", () => {
  it("rejects anonymous direct HTML and API requests without calling any upstream", async () => {
    const response = await events(request("/api/calendar/events"));
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const html = await page(request("/calendar/index.html"));
    expect(html.status).toBe(303);
    expect(html.headers.get("Location")).toContain("/calendar/sign-in");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("checks the whitelist anew so an existing session loses access after revocation", async () => {
    const token = await session();
    expect((await events(request("/api/calendar/events", token))).status).toBe(
      200,
    );
    allowed = false;
    expect((await events(request("/api/calendar/events", token))).status).toBe(
      403,
    );
    expect(
      (await page(request("/calendar/index.html", token))).headers.get(
        "Location",
      ),
    ).toContain("error=denied");
  });
  it("returns only published member-safe fields and prevents shared caching", async () => {
    const response = await events(
      request("/api/calendar/events", await session()),
    );
    const payload = await response.json();
    expect(payload.events).toHaveLength(1);
    expect(JSON.stringify(payload)).not.toMatch(
      /PRIVATE|Secret plan|Board meeting/,
    );
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const html = await page(request("/calendar/index.html", await session()));
    expect(html.status).toBe(200);
    expect(html.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'self'",
    );
    expect(await html.text()).toContain('id="calendar-content"');
  });
  it("fails closed when the database or auth configuration is unavailable", async () => {
    const token = await session();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Database offline");
      }),
    );
    expect((await events(request("/api/calendar/events", token))).status).toBe(
      503,
    );
    vi.stubEnv("CALENDAR_SESSION_SECRET", "");
    expect(
      await calendarAccess(request("/calendar/index.html", token)),
    ).toEqual({ allowed: false, status: 503 });
  });
  it("never accepts a claimed email from URL parameters or an invalid session", async () => {
    expect(
      (
        await events(
          request("/api/calendar/events?email=member@yale.edu", "fake"),
        )
      ).status,
    ).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("whitelist providers", () => {
  it("keeps Sheet credentials in server-to-server POST bodies", async () => {
    expect(await isWhitelisted("Member@Yale.edu")).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).not.toContain("secret");
    expect(init?.method).toBe("POST");
    expect(init?.cache).toBe("no-store");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      action: "access",
      email: "member@yale.edu",
    });
  });
  it("supports an Airtable whitelist and independently checks exact active emails", async () => {
    vi.stubEnv("CALENDAR_WHITELIST_PROVIDER", "airtable");
    vi.stubEnv("AIRTABLE_TOKEN", "test-token");
    vi.stubEnv("AIRTABLE_BASE_ID", "test-base");
    expect(await isWhitelisted("member@yale.edu")).toBe(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          records: [
            { fields: { Email: "stranger@yale.edu", Enabled: true } },
            { fields: { Email: "member@yale.edu", Enabled: false } },
          ],
        }),
      ),
    );
    expect(await isWhitelisted("member@yale.edu")).toBe(false);
  });
  it("rejects malformed backend responses and unknown providers", async () => {
    expect(() => projectEvents({ events: [] })).toThrow();
    vi.stubEnv("CALENDAR_WHITELIST_PROVIDER", "anything");
    await expect(isWhitelisted("member@yale.edu")).rejects.toThrow();
  });
});

async function transaction() {
  const response = await start();
  const cookie = response.cookies.get("yes_calendar_oauth")!.value;
  const payload = await readToken(cookie, secret, "oauth");
  return { response, cookie, payload: payload! };
}
async function issueGoogleToken(
  nonce: unknown,
  overrides: Record<string, unknown> = {},
) {
  googleToken = await new SignJWT({
    email: "member@yale.edu",
    email_verified: true,
    hd: "yale.edu",
    nonce,
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("google-member-id")
    .setIssuer("https://accounts.google.com")
    .setAudience("test-google-client")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}
function callbackRequest(cookie: string, state: unknown) {
  return request(
    `/api/calendar/auth/callback?code=test-code&state=${state}`,
    undefined,
    { headers: { Cookie: `yes_calendar_oauth=${cookie}` } },
  );
}

describe("Google code flow and logout", () => {
  it("starts with state, nonce, PKCE, and an HTTP-only short-lived transaction cookie", async () => {
    const { response, payload } = await transaction();
    const url = new URL(response.headers.get("Location")!);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("state")).toBe(payload.state);
    expect(url.searchParams.get("nonce")).toBe(payload.nonce);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(response.cookies.get("yes_calendar_oauth")?.httpOnly).toBe(true);
    expect(response.cookies.get("yes_calendar_oauth")?.maxAge).toBe(600);
  });
  it("issues a session only after verified Google identity and whitelist approval", async () => {
    const { cookie, payload } = await transaction();
    await issueGoogleToken(payload.nonce);
    const response = await callback(callbackRequest(cookie, payload.state));
    expect(response.headers.get("Location")).toBe("/calendar/index.html");
    const token = response.cookies.get("yes_calendar_session")?.value;
    expect((await readToken(token, secret, "session"))?.email).toBe(
      "member@yale.edu",
    );
    expect(response.cookies.get("yes_calendar_session")?.httpOnly).toBe(true);
    expect(response.cookies.get("yes_calendar_oauth")?.maxAge).toBe(0);
  });
  it("rejects a mismatched state before token exchange", async () => {
    const { cookie } = await transaction();
    const response = await callback(callbackRequest(cookie, "wrong-state"));
    expect(response.headers.get("Location")).toContain("error=signin");
    expect(response.cookies.get("yes_calendar_session")?.value).toBe("");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects mismatched nonce and nonwhitelisted accounts", async () => {
    const { cookie, payload } = await transaction();
    await issueGoogleToken("wrong-nonce");
    expect(
      (await callback(callbackRequest(cookie, payload.state))).headers.get(
        "Location",
      ),
    ).toContain("error=signin");
    await issueGoogleToken(payload.nonce);
    allowed = false;
    const denied = await callback(callbackRequest(cookie, payload.state));
    expect(denied.headers.get("Location")).toContain("error=denied");
    expect(denied.cookies.get("yes_calendar_session")?.value).toBe("");
  });
  it("rejects a token issued for another client", async () => {
    const { cookie, payload } = await transaction();
    googleToken = await new SignJWT({
      nonce: payload.nonce,
      email: "member@yale.edu",
      email_verified: true,
      hd: "yale.edu",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("https://accounts.google.com")
      .setAudience("attacker-client")
      .setSubject("123")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const response = await callback(callbackRequest(cookie, payload.state));
    expect(response.headers.get("Location")).not.toBe("/calendar/index.html");
    expect(response.cookies.get("yes_calendar_session")?.value).toBe("");
  });
  it("requires same-origin POST for logout and clears both cookies", async () => {
    expect(
      (
        await logout(
          request("/api/calendar/auth/logout", undefined, {
            method: "POST",
            headers: { Origin: "https://attacker.example" },
          }),
        )
      ).status,
    ).toBe(403);
    const response = await logout(
      request("/api/calendar/auth/logout", await session(), {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
      }),
    );
    expect(response.status).toBe(303);
    expect(response.cookies.get("yes_calendar_session")?.maxAge).toBe(0);
    expect(response.cookies.get("yes_calendar_oauth")?.maxAge).toBe(0);
  });
});

it("uses host-only Secure cookies for the production sign-in flow", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("CALENDAR_ORIGIN", "https://yesyale.org");
  const response = await start();
  const cookie = response.cookies.get("__Host-yes_calendar_oauth");
  expect(cookie?.secure).toBe(true);
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("lax");
  expect(cookie?.path).toBe("/");
  expect(cookie?.domain).toBeUndefined();
});


describe("event-scoped plus-ones", () => {
  it("only returns invited events to guests, and revocation takes effect on the next request", async () => {
    allowed = false;
    guestIds = ["one"];
    const token = await session("guest@gmail.com");
    const response = await events(request("/api/calendar/events?event=board-meeting", token));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ canInvite: false, events: [{ id: "one" }] });
    guestIds = ["other"];
    expect((await (await events(request("/api/calendar/events", token))).json()).events).toEqual([]);
    guestIds = [];
    expect((await events(request("/api/calendar/events", token))).status).toBe(403);
  });
  it("requires a member and same-origin POST before creating invitations", async () => {
    const token = await session();
    const options = { method: "POST", headers: { Origin: "http://localhost:3000" }, body: JSON.stringify({ eventId: "one", email: "forged@yale.edu" }) };
    expect((await createInvite(request("/api/calendar/invites", token, { ...options, headers: { Origin: "https://attacker.example" } }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    expect((await createInvite(request("/api/calendar/invites", undefined, options))).status).toBe(401);
    const result = await createInvite(request("/api/calendar/invites", token, options));
    expect(result.status).toBe(200);
    const url = new URL((await result.json()).url);
    expect(url.origin).toBe("http://localhost:3000");
    expect(readInvitationToken(url.searchParams.get("token"))).toMatch(/^[a-f0-9]{32}$/);
    const lastBody = JSON.parse(String(vi.mocked(fetch).mock.calls.at(-1)?.[1]?.body));
    expect(lastBody.email).toBe("member@yale.edu");
    allowed = false; guestIds = ["one"];
    expect((await createInvite(request("/api/calendar/invites", token, options))).status).toBe(403);
  });
  it("rejects malformed and forged invite tokens without disclosing an event", async () => {
    const id = "a".repeat(32), token = invitationToken(id);
    expect(readInvitationToken(token)).toBe(id);
    expect(readInvitationToken(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"))).toBeNull();
    expect(readInvitationToken('<script>alert(1)</script>')).toBeNull();
    const response = await invitePage(request('/calendar/invite?token=%22%3E%3Cscript%3E'));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('<script>');
    const page = await invitePage(request(`/calendar/invite?token=${token}`));
    expect(await page.text()).not.toContain('Member dinner');
    expect(page.headers.get('Referrer-Policy')).toBe('no-referrer');
  });
  it("binds an invite to the signed OAuth transaction and claims it only after identity verification", async () => {
    const id = "b".repeat(32);
    const response = await start(request(`/api/calendar/auth/start?invite=${invitationToken(id)}`));
    const cookie = response.cookies.get("yes_calendar_oauth")!.value;
    const payload = (await readToken(cookie, secret, "oauth"))!;
    expect(payload.inviteId).toBe(id);
    await issueGoogleToken(payload.nonce, { email: "guest@gmail.com" });
    allowed = false; guestIds = ["one"];
    const done = await callback(callbackRequest(cookie, payload.state));
    expect(done.headers.get("Location")).toBe("/calendar/index.html?event=one");
    expect((await readToken(done.cookies.get("yes_calendar_session")?.value, secret, "session"))?.email).toBe("guest@gmail.com");
    const claims = vi.mocked(fetch).mock.calls.map(([, init]) => String(init?.body)).filter(body => body.includes('invite_claim'));
    expect(claims).toHaveLength(1);
    expect(JSON.parse(claims[0])).toMatchObject({ id, email: "guest@gmail.com" });
  });
  it("does not consume invitations for invalid Google identities or a tampered OAuth state", async () => {
    const id = "c".repeat(32);
    const response = await start(request(`/api/calendar/auth/start?invite=${invitationToken(id)}`));
    const cookie = response.cookies.get("yes_calendar_oauth")!.value;
    const payload = (await readToken(cookie, secret, "oauth"))!;
    await issueGoogleToken(payload.nonce, { email_verified: false });
    const denied = await callback(callbackRequest(cookie, payload.state));
    expect(denied.headers.get("Location")).toContain('/calendar/invite?token=');
    expect(denied.cookies.get("yes_calendar_session")?.value).toBe("");
    await callback(callbackRequest(cookie, "tampered"));
    expect(vi.mocked(fetch).mock.calls.some(([, init]) => String(init?.body).includes('invite_claim'))).toBe(false);
  });
  it("keeps member-only behavior with an older deployment but fails closed for genuine backend errors", async () => {
    allowed = false;
    vi.stubGlobal("fetch", vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      return Response.json(body.action === 'access' ? { allowed: false } : { error: 'invalid_action' });
    }));
    const token = await session();
    expect((await events(request('/api/calendar/events', token))).status).toBe(403);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: 'invitation_service_unavailable' })));
    expect((await events(request('/api/calendar/events', token))).status).toBe(503);
  });
});
