import { NextResponse, type NextRequest } from "next/server";
import { authConfig, cookieName, PRIVATE_HEADERS } from "@/lib/calendar/config";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  let config;
  try {
    config = authConfig();
  } catch {
    return new NextResponse("Sign-out unavailable.", {
      status: 503,
      headers: PRIVATE_HEADERS,
    });
  }
  if (request.headers.get("origin") !== config.origin)
    return new NextResponse("Forbidden", { status: 403, headers: PRIVATE_HEADERS });
  const response = new NextResponse(null, {
    status: 303,
    headers: { ...PRIVATE_HEADERS, Location: "/calendar/sign-in" },
  });
  for (const kind of ["session", "oauth"] as const)
    response.cookies.set(cookieName(kind), "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
    });
  return response;
}
