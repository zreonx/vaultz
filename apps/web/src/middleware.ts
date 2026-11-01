import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/accounts",
  "/transactions",
  "/categories",
  "/budgets",
  "/savings",
  "/recurring",
  "/reports",
  "/settings",
];

const AUTH_PREFIXES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthCookie = Boolean(request.cookies.get("vaultz.jwt")?.value);

  const isPrivateRoute = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isPrivateRoute && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const isAuthRoute = AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isAuthRoute && hasAuthCookie) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const target =
      redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/transactions/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/savings/:path*",
    "/recurring/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
