"use client";
import { useEffect, Suspense } from "react";

function CallbackContent() {
  useEffect(() => {
    // Backend sets HttpOnly cookies during redirect, just go to dashboard
    // If there's an error in URL, backend would have redirected to login with error
    window.location.href = "/courses";
  }, []);

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
