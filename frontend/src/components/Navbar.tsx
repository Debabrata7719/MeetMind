"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `font-label-md text-label-md cursor-pointer transition-colors duration-200 ${
      isActive
        ? "text-primary font-bold border-b-2 border-primary pb-1"
        : "text-on-surface-variant hover:text-primary"
    }`;
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-gutter md:px-margin-desktop backdrop-blur-md transition-all duration-300 ${
        scrolled ? "shadow-sm bg-surface/95" : "bg-surface/80"
      }`}
    >
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <div className="w-8 h-8 primary-gradient rounded-lg flex items-center justify-center text-white">
          <span
            className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            auto_awesome
          </span>
        </div>
        <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary">
          MeetMind
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <Link href="/" className={getLinkClass("/")}>
          Product
        </Link>
        <Link href="/solutions" className={getLinkClass("/solutions")}>
          Solutions
        </Link>
        <Link href="/pricing" className={getLinkClass("/pricing")}>
          Pricing
        </Link>
        <Link href="/about" className={getLinkClass("/about")}>
          About
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="hidden sm:block font-label-md text-label-md text-on-surface-variant hover:text-primary px-4 py-2 transition-colors cursor-pointer"
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="primary-gradient text-white px-6 py-2.5 rounded-full font-label-md text-label-md font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-md inline-block cursor-pointer"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
