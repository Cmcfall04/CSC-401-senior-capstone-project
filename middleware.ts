// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const SESSION_COOKIE = "sp_session";

// Routes that require an auth session:
const PROTECTED = ["/pantry", "/recipes", "/shopping", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/";                    // send to welcome
    url.searchParams.set("next", pathname); // remember where they wanted to go
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pantry/:path*", "/recipes/:path*", "/shopping/:path*", "/admin/:path*"],
};