import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/lib/env";
import {
  rateLimit,
  createRateLimitResponse,
  getRateLimitConfig,
  resetRateLimit,
} from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const getBackendApiUrl = () =>
  (process.env.BACKEND_API_URL || "http://localhost:8000").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Apply rate limiting
    const rateLimitConfig = getRateLimitConfig("STRICT", validatedData.email);
    const rateLimitResult = await rateLimit(request, rateLimitConfig);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Call Python backend API (using OAuth2 form data)
    const formData = new URLSearchParams();
    formData.append("username", validatedData.email); // OAuth2 uses "username"
    formData.append("password", validatedData.password);

    const backendUrl = `${getBackendApiUrl()}/api/v1/auth/login`;
    console.log(`[LoginAPI] Calling: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error(`[LoginAPI] Backend error:`, errorData);
      
      await resetRateLimit(request, validatedData.email);
      
      return NextResponse.json(
        { error: errorData.detail || "Invalid email or password" },
        {
          status: 401,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const tokenData = await backendResponse.json();
    const { access_token, refresh_token } = tokenData;

    if (!access_token) {
      return NextResponse.json(
        { error: "Failed to get authentication token" },
        { status: 500 }
      );
    }

    // Reset rate limit on success
    await resetRateLimit(request, validatedData.email);

    // Create JWT for FE session management
    const jwtSecret = getJwtSecret();
    const token = await new SignJWT({
      userId: "from_backend",
      email: validatedData.email,
      accessToken: access_token,
      refreshToken: refresh_token,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(jwtSecret);

    const response = NextResponse.json({
      success: true,
      email: validatedData.email,
      accessToken: access_token,
      refreshToken: refresh_token,
    });

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.limit.toString()
    );
    response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[LoginAPI] Error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}