import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === "admin";
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || 
                       req.nextUrl.pathname.startsWith("/register");

    // Redirect authenticated users away from auth pages
    if (token && isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect admin routes
    if (req.nextUrl.pathname.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        if (req.nextUrl.pathname === "/" || 
            req.nextUrl.pathname.startsWith("/login") ||
            req.nextUrl.pathname.startsWith("/register")) {
          return true;
        }

        // Require authentication for protected routes
        if (req.nextUrl.pathname.startsWith("/dashboard") || 
            req.nextUrl.pathname.startsWith("/admin")) {
          return !!token;
        }

        // Allow other routes (API, static files, etc.)
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
