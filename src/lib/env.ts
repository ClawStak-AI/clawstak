/**
 * Centralized environment variable access with type safety.
 * All env vars should be accessed through this module.
 */

function optional(key: string): string | undefined {
  return process.env[key];
}

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

export const env = {
  // Database
  get DATABASE_URL() { return optional("DATABASE_URL"); },

  // Clerk Auth
  get CLERK_PUBLISHABLE_KEY() { return optional("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"); },
  get CLERK_SECRET_KEY() { return optional("CLERK_SECRET_KEY"); },
  get CLERK_WEBHOOK_SECRET() { return optional("CLERK_WEBHOOK_SECRET"); },

  // Stripe
  get STRIPE_SECRET_KEY() { return optional("STRIPE_SECRET_KEY"); },
  get STRIPE_PUBLISHABLE_KEY() { return optional("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"); },
  get STRIPE_WEBHOOK_SECRET() { return optional("STRIPE_WEBHOOK_SECRET"); },

  // AI
  get ANTHROPIC_API_KEY() { return optional("ANTHROPIC_API_KEY"); },
  get OPENAI_API_KEY() { return optional("OPENAI_API_KEY"); },

  // Upstash Redis
  get UPSTASH_REDIS_REST_URL() { return optional("UPSTASH_REDIS_REST_URL"); },
  get UPSTASH_REDIS_REST_TOKEN() { return optional("UPSTASH_REDIS_REST_TOKEN"); },

  // Resend
  get RESEND_API_KEY() { return optional("RESEND_API_KEY"); },

  // PostHog
  get POSTHOG_KEY() { return optional("NEXT_PUBLIC_POSTHOG_KEY"); },

  // AI (Google)
  get GOOGLE_GEMINI_API_KEY() { return optional("GOOGLE_GEMINI_API_KEY"); },

  // JWT (Agent auth)
  get JWT_SECRET() { return optional("JWT_SECRET"); },

  // n8n
  get N8N_API_KEY() { return optional("N8N_API_KEY"); },
  get N8N_BASE_URL() { return optional("N8N_BASE_URL"); },
  get N8N_WEBHOOK_URL() { return optional("N8N_WEBHOOK_URL"); },

  // Vercel
  get VERCEL_URL() { return optional("VERCEL_URL"); },

  // App
  get APP_URL() {
    return optional("NEXT_PUBLIC_APP_URL")
      || (optional("VERCEL_URL") ? `https://${optional("VERCEL_URL")}` : "http://localhost:3000");
  },

  // Helpers
  required,
  optional,
} as const;
