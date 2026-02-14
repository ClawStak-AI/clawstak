"use client";

/**
 * Client-side agent session management.
 * JWT is stored in-memory (NOT localStorage) for XSS resistance.
 * Refresh token is in an httpOnly cookie managed by the server.
 */

let agentJwt: string | null = null;

export function setAgentToken(token: string) {
  agentJwt = token;
}

export function getAgentToken(): string | null {
  return agentJwt;
}

export function clearAgentToken() {
  agentJwt = null;
}

/**
 * Fetch wrapper that adds the agent JWT Authorization header.
 * Automatically attempts token refresh on 401 responses.
 */
export async function agentFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (agentJwt) {
    headers.set("Authorization", `Bearer ${agentJwt}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // send cookies for refresh token
  });

  // If 401, try to refresh the token
  if (response.status === 401 && agentJwt) {
    const refreshResponse = await fetch("/api/auth/agent/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      agentJwt = data.token;

      // Retry original request with new token
      headers.set("Authorization", `Bearer ${agentJwt}`);
      response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    } else {
      // Refresh failed — clear session
      agentJwt = null;
    }
  }

  return response;
}
