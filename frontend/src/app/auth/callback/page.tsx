"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authService } from "@/lib/services";

function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") || undefined;
    const error = searchParams.get("error");

    if (error) {
      window.location.href = `/auth/login?error=${error}`;
      return;
    }

    if (code) {
      // Frontend-initiated OAuth flow: exchange code for cookies via backend
      authService
        .googleExchange(code, state)
        .then(() => {
          if (state) {
            // Connect Calendar flow
            window.location.href = "/calendar?connected=1";
          } else {
            window.location.href = "/courses";
          }
        })
        .catch(() => {
          window.location.href = "/auth/login?error=google_token_failed";
        });
    } else {
      // Backend-redirect flow (fallback): cookies already set by backend redirect
      window.location.href = "/courses";
    }
  }, [searchParams]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "#6b7280" }}>Signing in...</div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: "#6b7280" }}>Loading...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
