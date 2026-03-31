"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import BasketIcon from "@/components/BasketIcon";
import { API_BASE_URL } from "@/lib/config";

// Log API URL on component mount for debugging
if (typeof window !== "undefined") {
  console.log("API_BASE_URL:", API_BASE_URL);
  console.log("Current origin:", window.location.origin);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Disable scrolling when component mounts
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      console.log("Attempting to connect to:", `${API_BASE_URL}/auth/login`);
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
        mode: "cors", // Explicitly set CORS mode
      });
      
      if (!res.ok) {
        let errorMessage = "Login failed";
        try {
          const data = await res.json();
          errorMessage = data.detail || errorMessage;
        } catch {
          if (res.status === 429) {
            errorMessage = "Too many login attempts. Please wait a minute before trying again.";
          } else {
            errorMessage = `Server returned ${res.status}: ${res.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      document.cookie = `sp_session=${data.token}; Max-Age=${60 * 60 * 24 * 30}; Path=/`;
      router.replace("/dashboard");
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = `Cannot connect to server at ${API_BASE_URL}. Please make sure the backend is running.`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error("Login error:", error);
      setErr(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="h-screen w-screen flex items-center justify-center bg-gray-50 px-4 overflow-hidden fixed inset-0 -mt-16" style={{overflow: 'hidden'}}>
      <div className="w-full max-w-md">
        {/* Basket Icon */}
        <BasketIcon size={80} className="mb-4" />
        
        {/* Login Title */}
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">Login</h1>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-colors"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-colors"
              required
            />
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <span className="ml-2 text-sm text-gray-700">Remember me</span>
            </label>
            <Link href="#" className="text-sm text-green-600 hover:text-green-700">
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          {err && <p className="text-sm text-red-600 text-center">{err}</p>}
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-gray-600 mt-3">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-green-600 hover:text-green-700 font-medium">
            Sign up
          </Link>
        </p>

      </div>
    </section>
  );
}