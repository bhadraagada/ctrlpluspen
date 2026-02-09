import { auth } from "~/server/auth";
import { redirect, notFound } from "next/navigation";
import { TeamDetail } from "./team-detail";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { slug } = await params;

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Accents */}
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative mb-8 rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-5 sm:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Team Workspace</p>
        <p className="mt-2 text-sm text-white/55">Manage members, invites, credits, and shared generation output.</p>
      </div>

      <div className="relative">
        <TeamDetail slug={slug} />
      </div>
    </div>
  );
}
