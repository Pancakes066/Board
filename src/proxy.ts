import { NextResponse } from "next/server";

import { auth } from "@/server/auth/auth.config";

// Next.js 16 renamed the `middleware` convention to `proxy` (file and
// export name both). Route-protection logic is unchanged: anything under
// the authenticated (app) route group requires a session, auth pages
// bounce a signed-in user straight to the dashboard.
const AUTH_PAGES = ["/login", "/register"];

export default auth((req) => {
  const isAuthed = Boolean(req.auth);
  const { pathname } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  if (!isAuthed && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthed && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
