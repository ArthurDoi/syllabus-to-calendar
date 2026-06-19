import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syllabus to Calendar — Turn Your Syllabus Into a Study Schedule",
  description:
    "Upload your course syllabus and automatically generate a smart study calendar. Never miss a deadline again.",
};

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 2rem", background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111827" }}>
          📅 Syllabus to Calendar
        </span>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/auth/login" style={{
            padding: "0.45rem 1.1rem", borderRadius: "8px", fontSize: "0.875rem",
            color: "#374151", textDecoration: "none", border: "1px solid #d1d5db",
            background: "#fff",
          }}>Sign in</Link>
          <Link href="/auth/register" style={{
            padding: "0.45rem 1.1rem", borderRadius: "8px", fontSize: "0.875rem",
            color: "#fff", textDecoration: "none", background: "#1d4ed8",
          }}>Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "5rem 1.5rem 4rem" }}>
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 800,
          color: "#111827", lineHeight: 1.15, marginBottom: "1.25rem",
        }}>
          Turn Your Syllabus Into<br />
          <span style={{ color: "#1d4ed8" }}>a Smart Study Calendar</span>
        </h1>
        <p style={{
          fontSize: "1.125rem", color: "#4b5563", maxWidth: "560px",
          margin: "0 auto 2rem", lineHeight: 1.7,
        }}>
          Upload a PDF or image of your course syllabus. Our AI reads the schedule,
          extracts every deadline and class, and adds them straight to your Google Calendar.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth/register" style={{
            padding: "0.75rem 1.75rem", borderRadius: "10px", fontSize: "1rem",
            fontWeight: 600, color: "#fff", textDecoration: "none", background: "#1d4ed8",
            boxShadow: "0 4px 14px rgba(29,78,216,0.35)",
          }}>Start for free</Link>
          <Link href="/auth/login" style={{
            padding: "0.75rem 1.75rem", borderRadius: "10px", fontSize: "1rem",
            fontWeight: 600, color: "#1d4ed8", textDecoration: "none",
            border: "2px solid #1d4ed8", background: "#fff",
          }}>Sign in</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.75rem", fontWeight: 700, color: "#111827", marginBottom: "2.5rem" }}>
          How it works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
          {[
            { icon: "📄", title: "Upload your syllabus", desc: "Supports PDF, JPEG, PNG — any format your professor hands out." },
            { icon: "🤖", title: "AI extracts the schedule", desc: "Gemini AI reads dates, topics, assignments, and exams automatically." },
            { icon: "📅", title: "Sync to Google Calendar", desc: "All events are pushed directly to your Google Calendar in seconds." },
            { icon: "✅", title: "Never miss a deadline", desc: "Get reminders and stay on top of every class and due date." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: "#fff", borderRadius: "12px", padding: "1.75rem",
              border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{icon}</div>
              <h3 style={{ fontWeight: 700, color: "#111827", marginBottom: "0.5rem", fontSize: "1rem" }}>{title}</h3>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: "#1d4ed8", color: "#fff", textAlign: "center",
        padding: "4rem 1.5rem",
      }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>
          Ready to take control of your schedule?
        </h2>
        <p style={{ opacity: 0.85, marginBottom: "2rem", fontSize: "1rem" }}>
          Free to use. No credit card required.
        </p>
        <Link href="/auth/register" style={{
          padding: "0.75rem 2rem", borderRadius: "10px", fontSize: "1rem",
          fontWeight: 600, color: "#1d4ed8", textDecoration: "none",
          background: "#fff", display: "inline-block",
        }}>Create your free account</Link>
      </section>
    </div>
  );
}
