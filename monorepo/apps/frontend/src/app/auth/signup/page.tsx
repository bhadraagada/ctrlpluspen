"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const signupMutation = api.auth.signup.useMutation({
    onSuccess: () => {
      router.push("/auth/signin?registered=true");
    },
    onError: (error) => {
      if (error.data?.zodError) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(
          error.data.zodError.fieldErrors,
        )) {
          if (messages && messages.length > 0) {
            fieldErrors[field] = messages[0]!;
          }
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ form: error.message });
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    signupMutation.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#090b11] shadow-[0_20px_80px_-40px_rgba(16,185,129,0.35)] md:grid-cols-[1.05fr_1fr]">
        <div className="relative border-b border-white/10 p-8 md:border-b-0 md:border-r md:p-10">
          <div className="pointer-events-none absolute -left-14 -top-14 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

          <p className="relative text-xs uppercase tracking-[0.24em] text-white/40">Create Account</p>
          <h1 className="relative mt-4 text-3xl font-semibold tracking-tight text-white">Start with 10 free credits</h1>
          <p className="relative mt-3 text-sm leading-relaxed text-white/55">
            Set up your workspace to generate, manage, and collaborate on handwriting outputs.
          </p>

          <div className="relative mt-8 space-y-3 text-sm text-white/65">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Personal gallery with export-ready assets</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span>Team workspaces with shared generation history</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
              <span>No credit card needed to get started</span>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errors.form}
              </div>
            )}

            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-white/75">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/30 ${
                  errors.name ? "border-red-500/70" : "border-white/10"
                }`}
                placeholder="John Doe"
                required
              />
              {errors.name && <p className="mt-1 text-sm text-red-300">{errors.name}</p>}
            </div>

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
                className={`w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/30 ${
                  errors.email ? "border-red-500/70" : "border-white/10"
                }`}
                placeholder="you@example.com"
                required
              />
              {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email}</p>}
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
                className={`w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/30 ${
                  errors.password ? "border-red-500/70" : "border-white/10"
                }`}
                placeholder="••••••••"
                required
              />
              {errors.password && <p className="mt-1 text-sm text-red-300">{errors.password}</p>}
              <p className="mt-1 text-xs text-white/40">At least 8 characters with uppercase, lowercase, and number</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-white/75">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/30 ${
                  errors.confirmPassword ? "border-red-500/70" : "border-white/10"
                }`}
                placeholder="••••••••"
                required
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-300">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {signupMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/55">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-medium text-white hover:text-white/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
