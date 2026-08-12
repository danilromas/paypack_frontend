import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt"

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const claims = token ? await verifySessionToken(token) : null

  const { pathname, search } = req.nextUrl

  if (!claims) {
    const loginUrl = new URL("/auth", req.url)
    loginUrl.searchParams.set("redirect", pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith("/admin") && claims.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}
