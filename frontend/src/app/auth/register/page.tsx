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
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      await register(email, password, name);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg);
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-3 sm:px-4 py-6 sm:py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600 text-sm sm:text-base mb-6 sm:mb-8">Join us to get started</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4 sm:mb-5">
              <label className="text-xs sm:text-sm font-medium block mb-1.5 text-gray-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              />
            </div>

            <div className="mb-4 sm:mb-5">
              <label className="text-xs sm:text-sm font-medium block mb-1.5 text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              />
            </div>

            <div className="mb-4 sm:mb-5">
              <label className="text-xs sm:text-sm font-medium block mb-1.5 text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              />
            </div>

            <div className="mb-6 sm:mb-7">
              <label className="text-xs sm:text-sm font-medium block mb-1.5 text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              />
            </div>

            {error && <div className="text-red-600 text-xs sm:text-sm mb-5 font-medium">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-5 sm:mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 font-semibold hover:text-blue-700 no-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
