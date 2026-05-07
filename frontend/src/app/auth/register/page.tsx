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
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6 sm:mb-7">
          <span className="bg-blue-600 text-white rounded-lg w-8 sm:w-8 h-8 sm:h-8 flex items-center justify-center text-lg flex-shrink-0">📘</span>
          <span className="font-bold text-base sm:text-lg truncate">Syllabus to Calendar</span>
        </div>

        <div className="flex border-b border-gray-200 mb-5 sm:mb-6">
          <Link href="/auth/login" className="flex-1 py-2 text-center text-sm sm:text-base text-gray-600 border-b-2 border-transparent hover:text-gray-900 no-underline">Login</Link>
          <div className="flex-1 py-2 text-center font-bold text-sm sm:text-base border-b-2 border-blue-600 text-blue-600">Register</div>
        </div>

        <form onSubmit={handleSubmit}>
          {[["Full Name", "text", name, setName], ["Email", "email", email, setEmail],
          ["Password", "password", password, setPassword], ["Confirm Password", "password", confirm, setConfirm]
          ].map(([label, type, val, set]) => (
            <div key={label as string} className="mb-3 sm:mb-4">
              <label className="text-xs sm:text-sm font-medium block mb-1 sm:mb-2 text-gray-700">{label as string}</label>
              <input
                type={type as string}
                value={val as string}
                onChange={e => (set as (v: string) => void)(e.target.value)}
                required={label !== "Họ tên"}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}

          {error && <div className="text-red-600 text-xs sm:text-sm mb-3">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
