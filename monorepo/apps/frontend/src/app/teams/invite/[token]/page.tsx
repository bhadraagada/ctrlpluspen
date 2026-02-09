import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { AcceptInviteCard } from "./accept-invite-card";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function TeamInvitePage({ params }: Props) {
  const session = await auth();
  const { token } = await params;

  if (!session) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/teams/invite/${token}`)}`);
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative w-full">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Team Invite</p>
          <p className="mt-2 text-sm text-white/55">Validating your invite and preparing workspace access.</p>
        </div>
        <AcceptInviteCard token={token} />
      </div>
    </div>
  );
}
