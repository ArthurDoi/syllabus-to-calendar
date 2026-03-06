"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Mật khẩu không khớp"); return; }
    setError(""); setLoading(true);
    try {
      await register(email, password, name);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Đăng ký thất bại");
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
          <Link href="/auth/login" style={{ flex: 1, padding: "8px 0", textAlign: "center", fontSize: 14, color: "#6b7280", borderBottom: "2px solid transparent", textDecoration: "none" }}>Đăng nhập</Link>
          <div style={{ flex: 1, padding: "8px 0", textAlign: "center", fontWeight: 700, fontSize: 14, borderBottom: "2px solid #2563eb", color: "#2563eb" }}>Đăng ký</div>
        </div>

        <form onSubmit={handleSubmit}>
          {[["Họ tên", "text", name, setName], ["Email", "email", email, setEmail],
            ["Mật khẩu", "password", password, setPassword], ["Xác nhận mật khẩu", "password", confirm, setConfirm]
          ].map(([label, type, val, set]) => (
            <div key={label as string} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5, color: "#374151" }}>{label as string}</label>
              <input type={type as string} value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)}
                required={label !== "Họ tên"}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }} />
            </div>
          ))}

          {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "10px", background: loading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>
      </div>
    </div>
  );
}
