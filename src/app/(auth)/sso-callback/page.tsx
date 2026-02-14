import { SSOCallbackHandler } from "@/components/auth/sso-callback-handler";

// Prevent prerendering - this page requires Clerk runtime context
export const dynamic = "force-dynamic";

export default function SSOCallbackPage() {
  return <SSOCallbackHandler />;
}
