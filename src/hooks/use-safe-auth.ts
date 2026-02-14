"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Safe wrapper around Clerk's useUser hook.
 * Returns sensible defaults when ClerkProvider is not available (e.g., during build).
 */
export function useSafeAuth() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isSignedIn, isLoaded, user } = useClerkUser();
    return {
      isSignedIn: isSignedIn ?? false,
      isLoaded: hasMounted && (isLoaded ?? false),
      user: user ?? null,
    };
  } catch {
    // ClerkProvider not available (build time or missing env vars)
    return {
      isSignedIn: false,
      isLoaded: hasMounted,
      user: null,
    };
  }
}
