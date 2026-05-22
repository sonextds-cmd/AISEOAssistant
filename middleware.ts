import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/", "/api/analyze", "/api/export"];
const publicRoutes = ["/login"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth();

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
