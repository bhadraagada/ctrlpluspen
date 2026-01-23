"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { api } from "~/trpc/react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session, status } = useSession();
  const { data: balance } = api.credits.getBalance.useQuery(undefined, {
    enabled: !!session,
  });
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#05070d]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-white/90 ring-1 ring-white/10 transition group-hover:bg-white group-hover:text-black">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium tracking-wide text-white">
            Handwriting Studio
          </span>
        </Link>

        {/* Center Navigation */}
        <div className="hidden items-center gap-1 rounded-full border border-white/5 bg-white/[0.02] p-1 backdrop-blur-md md:flex">
          {[
            { href: "/synthesis", label: "Synthesis" },
            { href: "/recognize", label: "Recognition" },
            { href: "/templates", label: "Templates" },
            { href: "/bulk", label: "Bulk" },
            { href: "/teams", label: "Teams" },
            { href: "/gallery", label: "Gallery" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-white text-black shadow-lg" // Active: white bg, black text
                    : "text-white hover:bg-white/[0.05]" // Inactive: white text, hover black
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Right Action Area */}
        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
          ) : session ? (
            <>
              {/* Credits */}
              <Link
                href="/credits"
                className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-white sm:flex"
              >
                <span>{balance?.credits ?? 0}</span>
                <span className="text-white/40">credits</span>
              </Link>

              {/* User Menu */}
              <div className="flex items-center gap-3 border-l border-white/10 pl-3">
                <button
                  onClick={() => signOut()}
                  className="text-xs font-medium text-white/40 transition hover:text-white"
                >
                  Sign out
                </button>
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    className="h-8 w-8 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white">
                    {session.user.name?.[0] ?? "U"}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="text-xs font-medium text-white/60 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold !text-black transition hover:bg-white/90"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
