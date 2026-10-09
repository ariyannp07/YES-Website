import { NextResponse, type NextRequest } from "next/server";
import { PRIVATE_HEADERS } from "@/lib/calendar/config";
export function GET(request: NextRequest) {
  const url = new URL("/calendar/index.html", request.url);
  url.search = request.nextUrl.search;
  const response = NextResponse.redirect(url, 303);
  Object.entries(PRIVATE_HEADERS).forEach(([key, value]) =>
    response.headers.set(key, value),
  );
  return response;
}
