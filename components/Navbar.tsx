"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("sp_session="));
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(hasSessionCookie());
  }, [pathname]);

  useEffect(() => {
    const update = () => setAuthed(hasSessionCookie());
    window.addEventListener("auth-change", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("auth-change", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  function handleLogout() {
    document.cookie = "sp_session=; Max-Age=0; Path=/";
    window.dispatchEvent(new Event("auth-change"));
    router.replace("/");
  }

  const links = [
    { name: "Home", href: "/" },
    ...(authed
      ? [
          { name: "Pantry", href: "/pantry" },
          { name: "Recipes", href: "/recipes" },
          { name: "Shopping", href: "/shopping" },
          { name: "Admin", href: "/admin" },
          { name: "About", href: "/about" },
        ]
      : [{ name: "About", href: "/about" }]),
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isHome
          ? "bg-transparent backdrop-blur-md shadow-none"
          : "bg-white/95 backdrop-blur-md shadow-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <Link
          href="/"
          className={`flex items-center gap-2 font-semibold ${
            isHome ? "text-white" : "text-slate-900"
          }`}
        >
          <Image
            src="/logo.svg"
            alt="SmartPantry logo"
            width={30}
            height={30}
            className={isHome ? "rounded-md bg-white/80 p-1" : ""}
          />
          <span>SmartPantry</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-green-600 text-white"
                    : isHome
                    ? "text-white hover:bg-green-600/50"
                    : "text-slate-700 hover:bg-green-50"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {authed ? (
            <button
              onClick={handleLogout}
              className={`ml-3 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isHome
                  ? "border border-white/70 text-white hover:bg-white/20"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Log out
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="ml-3 rounded-full bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isHome
                    ? "border border-green-400 text-green-100 hover:bg-green-600/40"
                    : "border border-green-600 text-green-700 hover:bg-green-50"
                }`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}