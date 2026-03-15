import { SessionUser } from "@/lib/session";

/**
 * Resolve user ID from session
 * Always returns the authenticated user's ID (no mock user fallback)
 */
export async function resolveUserId(session: SessionUser): Promise<string> {
  return session.userId;
}

