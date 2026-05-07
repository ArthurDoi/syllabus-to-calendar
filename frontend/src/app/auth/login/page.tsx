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
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-3 sm:px-4 py-6 sm:py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6 sm:mb-7">
          <span className="bg-blue-600 text-white rounded-lg w-8 sm:w-8 h-8 sm:h-8 flex items-center justify-center text-lg flex-shrink-0">📘</span>
          <span className="font-bold text-base sm:text-lg truncate">Syllabus to Calendar</span>
        </div>

        <div className="flex border-b border-gray-200 mb-5 sm:mb-6">
          <div className="flex-1 py-2 text-center font-bold text-sm sm:text-base border-b-2 border-blue-600 text-blue-600">Login</div>
          <Link href="/auth/register" className="flex-1 py-2 text-center text-sm sm:text-base text-gray-600 border-b-2 border-transparent hover:text-gray-900 no-underline">Register</Link>
        </div>

        <form onSubmit={handleSubmit}>
          {[["Email", "email", email, setEmail], ["Password", "password", password, setPassword]].map(([label, type, val, set]) => (
            <div key={label as string} className="mb-3 sm:mb-4">
              <label className="text-xs sm:text-sm font-medium block mb-1 sm:mb-2 text-gray-700">{label as string}</label>
              <input
                type={type as string}
                value={val as string}
                onChange={e => (set as (v: string) => void)(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}

          {error && <div className="text-red-600 text-xs sm:text-sm mb-3">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg transition-colors mb-3 sm:mb-4"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            onClick={authService.googleLogin}
            className="w-full px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="hidden sm:inline">Continue with Google</span>
            <span className="sm:hidden">Google</span>
          </button>
        </form>
      </div>
    </div>
  );
}
