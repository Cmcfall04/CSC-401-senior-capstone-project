"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // Mock “auth”: set a cookie for 30 days
      document.cookie = `sp_session=dev; Max-Age=${60 * 60 * 24 * 30}; Path=/`;
      // Send them to the pantry every time
      router.replace("/pantry");
    } catch (e) {
      setErr("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"
      >
        <h1 className="mb-4 text-2xl font-semibold">Log in</h1>

        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      </form>
    </section>
  );
}