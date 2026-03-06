"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Backend redirect về đây với token trong query params
// Hoặc backend có thể redirect về /auth/callback?access_token=...
export default function GoogleCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    if (access && refresh) {
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      router.push("/courses");
    } else {
      router.push("/auth/login?error=google_failed");
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "#6b7280" }}>Đang xử lý đăng nhập Google...</div>
    </div>
  );
}
