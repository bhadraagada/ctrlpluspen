"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisteredMessage, setShowRegisteredMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setShowRegisteredMessage(true);
    }
    if (searchParams.get("error")) {
      setError("Invalid email or password");
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    void signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#090b11] shadow-[0_20px_80px_-40px_rgba(16,185,129,0.35)] md:grid-cols-[1.05fr_1fr]">
      <div className="relative border-b border-white/10 p-8 md:border-b-0 md:border-r md:p-10">
        <div className="pointer-events-none absolute -left-14 -top-14 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

        <p className="relative text-xs uppercase tracking-[0.24em] text-white/40">Welcome Back</p>
        <h1 className="relative mt-4 text-3xl font-semibold tracking-tight text-white">Continue your handwriting workflow</h1>
        <p className="relative mt-3 text-sm leading-relaxed text-white/55">
          Access synthesis, team collaboration, and your saved gallery from one workspace.
        </p>

        <div className="relative mt-8 space-y-3 text-sm text-white/65">
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Generate and store realistic handwriting outputs</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span>Collaborate in teams with shared credits</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
            <span>Track all generations in a private gallery</span>
          </div>
        </div>
      </div>

      <div className="p-8 md:p-10">
        {showRegisteredMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Account created successfully. Please sign in.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-white/75">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/30"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-white/75">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/30"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/55">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-white hover:text-white/80">
            Sign up
          </Link>
        </p>

        <div className="mt-6 text-center text-xs text-white/40">
          <p>
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-white/70 hover:text-white">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-white/70 hover:text-white">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}
