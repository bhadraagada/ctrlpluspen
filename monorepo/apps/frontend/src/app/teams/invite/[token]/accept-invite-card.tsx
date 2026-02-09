"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

interface AcceptInviteCardProps {
  token: string;
}

export function AcceptInviteCard({ token }: AcceptInviteCardProps) {
  const router = useRouter();
  const startedRef = useRef(false);

  const acceptInviteMutation = api.teams.acceptInvite.useMutation({
    onSuccess: (data) => {
      router.replace(`/teams/${data.team.slug}`);
    },
  });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    acceptInviteMutation.mutate({ token });
  }, [token, acceptInviteMutation]);

  if (acceptInviteMutation.isPending) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center shadow-[0_0_50px_-30px_rgba(16,185,129,0.5)]">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <h1 className="mt-4 text-xl font-semibold text-white">Joining team...</h1>
        <p className="mt-2 text-sm text-white/50">Please wait while we process your invite.</p>
      </div>
    );
  }

  if (acceptInviteMutation.error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center shadow-[0_0_40px_-25px_rgba(239,68,68,0.6)]">
        <h1 className="text-xl font-semibold text-red-300">Invite could not be accepted</h1>
        <p className="mt-2 text-sm text-white/60">{acceptInviteMutation.error.message}</p>
        <Link
          href="/teams"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Go to Teams
        </Link>
      </div>
    );
  }

  return null;
}
