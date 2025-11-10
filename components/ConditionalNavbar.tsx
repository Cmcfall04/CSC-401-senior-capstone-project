"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't show navbar on landing page, login page, or signup page
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    return null;
  }
  
  return <Navbar />;
}

