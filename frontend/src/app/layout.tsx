import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syllabus to Calendar",
  description: "Automatically convert syllabus to study schedule",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="TQj-XquuCH51GNQbiHFiuedyHyt-yb5HzpSIOAsyy3c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="white" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <footer style={{ textAlign: "center", marginTop: "2rem", padding: "1rem 0.5rem" }}>
          <a href="/privacy" style={{ color: "#6b7280", textDecoration: "underline", fontSize: "12px" }}>Privacy Policy</a>
          {' | '}
          <a href="/terms" style={{ color: "#6b7280", textDecoration: "underline", fontSize: "12px" }}>Terms of Service</a>
        </footer>
      </body>
    </html>
  );
}