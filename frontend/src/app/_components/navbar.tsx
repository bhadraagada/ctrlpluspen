"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { api } from "~/trpc/react";

export function Navbar() {
  const { data: session, status } = useSession();
  const { data: balance } = api.credits.getBalance.useQuery(undefined, {
    enabled: !!session,
  });

  return (
    <nav className="sticky top-0 z-30 border-b border-white/5 bg-[#05070d]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/30 to-indigo-500/30 text-cyan-300 ring-1 ring-white/10">
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
          <div className="flex flex-col leading-tight">
            <span className="text-sm uppercase tracking-[0.18em] text-white/60">
              Handwriting Studio
            </span>
            <span className="text-lg font-semibold text-white">Ink + OCR</span>
          </div>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/#features"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/synthesis"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Synthesis
          </Link>
          <Link
            href="/gallery"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Gallery
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            OCR
          </Link>
          <Link
            href="/#pricing"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
          ) : session ? (
            <>
              <Link
                href="/credits"
                className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-amber-200/90 shadow-sm transition hover:border-amber-300/50 hover:bg-amber-200/10 sm:flex"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                </svg>
                <span>{balance?.credits ?? 0}</span>
                <span className="text-white/60">credits</span>
              </Link>

              <Link
                href="/synthesis"
                className="hidden rounded-full bg-linear-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110 lg:inline-flex"
              >
                Open Studio
              </Link>

              <div className="flex items-center gap-3 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                )}
                <button
                  onClick={() => signOut()}
                  className="text-sm text-white/70 transition hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-linear-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
