"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/services";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg);
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Email hoặc mật khẩu không đúng");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <div style={{ width: 400, background: "#fff", borderRadius: 16, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <span style={{ background: "#2563eb", color: "#fff", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>📘</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Syllabus to Calendar</span>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
          <div style={{ flex: 1, padding: "8px 0", textAlign: "center", fontWeight: 700, fontSize: 14, borderBottom: "2px solid #2563eb", color: "#2563eb" }}>Đăng nhập</div>
          <Link href="/auth/register" style={{ flex: 1, padding: "8px 0", textAlign: "center", fontSize: 14, color: "#6b7280", borderBottom: "2px solid transparent", textDecoration: "none" }}>Đăng ký</Link>
        </div>

        <form onSubmit={handleSubmit}>
          {[["Email", "email", email, setEmail], ["Mật khẩu", "password", password, setPassword]].map(([label, type, val, set]) => (
            <div key={label as string} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5, color: "#374151" }}>{label as string}</label>
              <input type={type as string} value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)} required
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }} />
            </div>
          ))}

          {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "10px", background: loading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginBottom: 10 }}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <button type="button" onClick={authService.googleLogin}
            style={{ width: "100%", padding: "10px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            🔵 Tiếp tục với Google
          </button>
        </form>
      </div>
    </div>
  );
}
