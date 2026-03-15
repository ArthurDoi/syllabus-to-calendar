import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { resolveUserId } from "@/lib/user-resolver";

const getBackendApiUrl = () =>
  (process.env.BACKEND_API_URL || "http://localhost:3001").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = await resolveUserId(session);
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const backendUrl = `${getBackendApiUrl()}/api/v1/chat/ask`;
    console.log(`[ChatAPI] Forwarding request to: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        message,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`[ChatAPI] Backend failed with status ${backendResponse.status}: ${errorText}`);
      return NextResponse.json(
        { error: `Backend request failed: ${errorText}` },
        { status: backendResponse.status }
      );
    }

    // Check if backend returned JSON (action) or streaming (query)
    const contentType = backendResponse.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      // Forward JSON response for actions (CREATE/DELETE)
      const jsonData = await backendResponse.json();
      return NextResponse.json(jsonData);
    } else {
      // Proxy the streaming response for queries
      return new Response(backendResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }
  } catch (error) {
    console.error("[ChatAPI] Internal Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
