// components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BasketIcon from "./BasketIcon";

function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("sp_session="));
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Transparent style only on home when NOT logged in
  const isHomeLoggedOut = pathname === "/" && !authed;

  useEffect(() => {
    setAuthed(hasSessionCookie());
  }, [pathname]);

  useEffect(() => {
    const update = () => setAuthed(hasSessionCookie());
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("auth-change", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    // Close mobile menu on route change
    window.addEventListener("popstate", closeMenu);
    return () => {
      window.removeEventListener("auth-change", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("popstate", closeMenu);
    };
  }, []);

  function handleLogout() {
    document.cookie = "sp_session=; Max-Age=0; Path=/";
    window.dispatchEvent(new Event("auth-change"));
    router.replace("/");
    setMenuOpen(false);
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

  const baseText = isHomeLoggedOut ? "text-white" : "text-slate-900";

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isHomeLoggedOut
          ? "bg-transparent backdrop-blur-md shadow-none"
          : "bg-white/95 backdrop-blur-md shadow-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className={`flex items-center gap-2 font-semibold ${baseText}`}
        >
          <BasketIcon size={28} />
          <span className="text-base sm:text-lg">SmartPantry</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 sm:px-4 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-green-600 text-white"
                    : isHomeLoggedOut
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
              className={`ml-2 sm:ml-3 rounded-full px-3 sm:px-4 py-1.5 text-sm font-medium transition ${
                isHomeLoggedOut
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
                className="ml-2 sm:ml-3 rounded-full bg-green-600 px-3 sm:px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={`rounded-full px-3 sm:px-4 py-1.5 text-sm font-medium transition ${
                  isHomeLoggedOut
                    ? "border border-green-400 text-green-100 hover:bg-green-600/40"
                    : "border border-green-600 text-green-700 hover:bg-green-50"
                }`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden p-2 rounded ${isHomeLoggedOut ? "text-white hover:bg-white/15" : "text-slate-700 hover:bg-slate-100"}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
      </div>

      {/* Mobile menu (slides under the navbar) */}
      <div
        className={`md:hidden transition-[max-height,opacity] duration-300 overflow-hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        } ${isHomeLoggedOut ? "bg-black/60 text-white" : "bg-white/95 text-slate-800"} backdrop-blur-md`}
      >
        <div className="px-4 pb-4 pt-2 space-y-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-green-600 text-white"
                    : isHomeLoggedOut
                    ? "hover:bg-white/10"
                    : "hover:bg-slate-100"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {authed ? (
            <button
              onClick={handleLogout}
              className={`w-full mt-1 rounded-lg px-3 py-2 text-sm font-medium ${
                isHomeLoggedOut
                  ? "border border-white/60 text-white hover:bg-white/10"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Log out
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-green-700"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium ${
                  isHomeLoggedOut
                    ? "border border-green-400 text-green-100 hover:bg-white/10"
                    : "border border-green-600 text-green-700 hover:bg-green-50"
                }`}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}