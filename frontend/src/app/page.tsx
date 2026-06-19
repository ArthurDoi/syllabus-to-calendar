import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syllabus to Calendar — Turn Your Syllabus Into a Study Schedule",
  description:
    "Upload your course syllabus and automatically generate a smart study calendar with Google Calendar integration.",
};

// ─── Inline SVG icons — no external dependency needed ────────────────────────
const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const BrainIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.69 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.77z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.69 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.77z"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const STEPS = [
  {
    Icon: UploadIcon,
    color: "#1a73e8",
    bg: "#e8f0fe",
    title: "Upload your syllabus",
    desc: "Drag & drop any PDF, JPEG, or PNG. We handle every format your professor hands out.",
  },
  {
    Icon: BrainIcon,
    color: "#0f9d58",
    bg: "#e6f4ea",
    title: "AI extracts the schedule",
    desc: "Gemini AI reads every date, topic, assignment, and exam — zero manual input required.",
  },
  {
    Icon: CalendarIcon,
    color: "#f4b400",
    bg: "#fef7e0",
    title: "Events sync to Google Calendar",
    desc: "Your full academic schedule lands in Google Calendar in seconds, ready with reminders.",
  },
  {
    Icon: CheckIcon,
    color: "#db4437",
    bg: "#fce8e6",
    title: "Never miss a deadline",
    desc: "Focus on learning. Let the calendar handle everything else automatically.",
  },
];

const BENEFITS = [
  "Works with any university syllabus format",
  "Powered by Google Gemini AI",
  "Direct Google Calendar sync",
  "Free to get started",
];

export default function LandingPage() {
  return (
    <>
      <style>{`
        /* Google-style focus ring & smooth interactions */
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: "Google Sans", "Roboto", "Segoe UI", Arial, sans-serif; }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 24px; font-size: 0.9375rem;
          font-weight: 500; color: #fff; background: #1a73e8;
          text-decoration: none; border: none; cursor: pointer;
          transition: box-shadow 0.2s, background 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .btn-primary:hover { background: #1557b0; box-shadow: 0 4px 12px rgba(26,115,232,.4); }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 26px; border-radius: 24px; font-size: 0.9375rem;
          font-weight: 500; color: #1a73e8; background: transparent;
          text-decoration: none; border: 1.5px solid #dadce0; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .btn-secondary:hover { background: #e8f0fe; border-color: #1a73e8; }
        .step-card {
          background: #fff; border-radius: 12px; padding: 28px;
          border: 1px solid #e8eaed;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .step-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.1); transform: translateY(-2px); }
        .nav-link {
          color: #5f6368; text-decoration: none; font-size: 0.875rem;
          font-weight: 500; padding: 8px 12px; border-radius: 4px;
          transition: background 0.15s;
        }
        .nav-link:hover { background: #f1f3f4; color: #202124; }
      `}</style>

      <div style={{ background: "#fff", color: "#202124" }}>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 64,
          borderBottom: "1px solid #e8eaed",
          position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <span style={{ fontWeight: 600, fontSize: "1rem", color: "#202124", letterSpacing: "-0.01em" }}>
              Syllabus to Calendar
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/auth/login" className="nav-link">Sign in</Link>
            <Link href="/auth/register" className="btn-primary" style={{ padding: "10px 20px", fontSize: "0.875rem" }}>
              Get started
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section style={{
          maxWidth: 800, margin: "0 auto",
          padding: "80px 24px 72px",
          textAlign: "center",
        }}>
          {/* Pill badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 20,
            background: "#e8f0fe", color: "#1a73e8",
            fontSize: "0.8125rem", fontWeight: 500, marginBottom: 24,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a73e8", display: "inline-block" }} />
            Powered by Google Gemini AI
          </div>

          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700,
            lineHeight: 1.2, letterSpacing: "-0.02em",
            color: "#202124", margin: "0 0 20px",
          }}>
            Turn your syllabus into<br />
            <span style={{ color: "#1a73e8" }}>a complete study calendar</span>
          </h1>

          <p style={{
            fontSize: "1.125rem", color: "#5f6368",
            lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px",
          }}>
            Upload a PDF or photo of your course syllabus. Our AI extracts every
            class, deadline, and exam — then syncs them directly to Google Calendar.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth/register" className="btn-primary">
              Try it free <ArrowIcon />
            </Link>
            <Link href="/auth/login" className="btn-secondary">
              Sign in
            </Link>
          </div>

          {/* Trust signals */}
          <div style={{
            display: "flex", justifyContent: "center", flexWrap: "wrap",
            gap: "8px 24px", marginTop: 40,
          }}>
            {BENEFITS.map((b) => (
              <span key={b} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: "0.8125rem", color: "#5f6368",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1a73e8">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                {b}
              </span>
            ))}
          </div>
        </section>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: "#e8eaed", maxWidth: 960, margin: "0 auto" }} />

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section style={{ maxWidth: 960, margin: "0 auto", padding: "72px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1a73e8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              How it works
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, color: "#202124", margin: 0 }}>
              From syllabus to calendar in 3 steps
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 20,
          }}>
            {STEPS.map(({ Icon, color, bg, title, desc }, i) => (
              <div key={title} className="step-card">
                {/* Step number + icon */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: bg,
                    display: "flex", alignItems: "center", justifyContent: "center", color,
                    flexShrink: 0,
                  }}>
                    <Icon />
                  </div>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#bdc1c6",
                    letterSpacing: "0.06em",
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#202124", margin: "0 0 8px" }}>
                  {title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#5f6368", lineHeight: 1.65, margin: 0 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────────────────────────── */}
        <section style={{
          background: "#f8f9fa",
          borderTop: "1px solid #e8eaed",
          borderBottom: "1px solid #e8eaed",
        }}>
          <div style={{
            maxWidth: 720, margin: "0 auto",
            padding: "64px 24px", textAlign: "center",
          }}>
            <h2 style={{
              fontSize: "clamp(1.5rem, 3vw, 1.875rem)", fontWeight: 700,
              color: "#202124", marginBottom: 12,
            }}>
              Ready to reclaim your time?
            </h2>
            <p style={{ color: "#5f6368", fontSize: "1rem", lineHeight: 1.7, marginBottom: 32 }}>
              Join students who spend less time copying schedules and more time studying.
              Free to start — no credit card needed.
            </p>
            <Link href="/auth/register" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
              Get started for free <ArrowIcon />
            </Link>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 24, padding: "24px", flexWrap: "wrap",
          fontSize: "0.8125rem", color: "#9aa0a6",
        }}>
          <span>© {new Date().getFullYear()} Syllabus to Calendar</span>
          <Link href="/privacy" style={{ color: "#5f6368", textDecoration: "none" }} className="nav-link">Privacy Policy</Link>
          <Link href="/terms" style={{ color: "#5f6368", textDecoration: "none" }} className="nav-link">Terms of Service</Link>
        </footer>

      </div>
    </>
  );
}
