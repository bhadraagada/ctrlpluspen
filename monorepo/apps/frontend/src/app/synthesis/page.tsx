import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SynthesisDashboard } from "~/app/_components/synthesis-dashboard";

export default async function SynthesisPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Accents - Subtle Glows */}
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-white/[0.02] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-white/[0.02] blur-3xl" />

      <div className="relative mb-12">
        <h1 className="text-4xl font-medium tracking-tight text-white">Synthesis</h1>
        <p className="mt-2 text-white/50">
          Welcome back, {session.user.name ?? "User"}. Transform text into natural handwriting.
        </p>
      </div>
      
      <div className="relative">
        <SynthesisDashboard />
      </div>
    </div>
  );
}
