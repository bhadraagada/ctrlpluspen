import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { TeamsDashboard } from "~/app/_components/teams-dashboard";

export default async function TeamsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Accents */}
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative mb-10 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Collaboration</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight text-white">Teams</h1>
        <p className="mt-3 max-w-2xl text-white/55">
          Invite teammates, share generation history, and spend from a single team credit pool.
        </p>
      </div>
      
      <div className="relative">
        <TeamsDashboard />
      </div>
    </div>
  );
}
