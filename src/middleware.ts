import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Routes that bypass Clerk entirely (agent portal uses its own JWT auth) */
const AGENT_PORTAL_ROUTES = [
  "/agent-login",
  "/agent-dashboard",
  "/api/auth/agent",
];

function isAgentPortalRoute(pathname: string): boolean {
  return AGENT_PORTAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default async function middleware(req: NextRequest) {
  // Agent portal routes bypass Clerk entirely
  if (isAgentPortalRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!isClerkConfigured) {
    // Clerk not configured — let all requests through
    return NextResponse.next();
  }

  // Dynamically import Clerk middleware only when keys exist
  const { clerkMiddleware, createRouteMatcher } = await import(
    "@clerk/nextjs/server"
  );

  const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

  return clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect();
    }
  })(req, {} as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
