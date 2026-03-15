import { cookies } from "next/headers";
import { jwtVerify, JWTPayload } from "jose";
import { getJwtSecret } from "./env";

export interface SessionUser {
  userId: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface SessionResult {
  session: SessionUser | null;
  expired: boolean;
}

/**
 * Check if JWT error indicates expired token
 */
function isExpiredTokenError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED';
  }
  return false;
}

/**
 * Get current user from session
 * Returns session result with expired flag to distinguish expired vs missing tokens
 */
export async function getSession(): Promise<SessionResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return { session: null, expired: false };
    }

    const jwtSecret = getJwtSecret();
    const { payload } = await jwtVerify(token, jwtSecret);

    return {
      session: {
        userId: payload.userId as string,
        email: payload.email as string,
      },
      expired: false,
    };
  } catch (error) {
    // Check if token is expired vs invalid
    const expired = isExpiredTokenError(error);
    return { session: null, expired };
  }
}

/**
 * Check if session is expired (helper function for backward compatibility)
 */
export async function isSessionExpired(): Promise<boolean> {
  const result = await getSession();
  return result.expired;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<SessionUser> {
  const sessionResult = await getSession();

  if (!sessionResult.session) {
    throw new Error("Unauthorized");
  }

  return sessionResult.session;
}

