import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  rateLimit,
  createRateLimitResponse,
  getRateLimitConfig,
} from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

const getBackendApiUrl = () =>
  (process.env.BACKEND_API_URL || "http://localhost:8000").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Apply rate limiting
    const rateLimitConfig = getRateLimitConfig("MODERATE");
    const rateLimitResult = await rateLimit(request, rateLimitConfig);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Call Python backend API
    const backendUrl = `${getBackendApiUrl()}/api/v1/auth/register`;
    console.log(`[RegisterAPI] Calling: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name || null,
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error(`[RegisterAPI] Backend error:`, errorData);

      return NextResponse.json(
        { error: errorData.detail || "Registration failed" },
        {
          status: backendResponse.status,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const userData = await backendResponse.json();

    const response = NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
      },
    });

    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString()
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

    console.error("[RegisterAPI] Error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}