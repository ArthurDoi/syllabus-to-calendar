import type { Metadata } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syllabus to Calendar",
  description: "Automatically convert syllabus to study schedule",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="TQj-XquuCH51GNQbiHFiuedyHyt-yb5HzpSIOAsyy3c" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <footer style={{ textAlign: "center", marginTop: "2rem", padding: "1rem" }}>
          <a href="/privacy" style={{ color: "#6b7280", textDecoration: "underline" }}>Privacy Policy</a>
          {' | '}
          <a href="/terms" style={{ color: "#6b7280", textDecoration: "underline" }}>Terms of Service</a>
        </footer>
      </body>
    </html>
  );
}