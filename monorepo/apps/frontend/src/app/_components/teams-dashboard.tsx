"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

const ROLE_STYLES: Record<TeamRole, { bg: string; text: string }> = {
  OWNER: { bg: "bg-amber-500/20", text: "text-amber-400" },
  ADMIN: { bg: "bg-purple-500/20", text: "text-purple-400" },
  MEMBER: { bg: "bg-blue-500/20", text: "text-blue-400" },
};

export function TeamsDashboard() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState<string | null>(null);
  
  // Create team form
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  
  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  
  // Add credits form
  const [creditsAmount, setCreditsAmount] = useState(100);

  const utils = api.useUtils();
  const teamsQuery = api.teams.getMyTeams.useQuery();
  const creditsQuery = api.credits.getBalance.useQuery();

  const createTeamMutation = api.teams.create.useMutation({
    onSuccess: () => {
      utils.teams.getMyTeams.invalidate();
      setShowCreateModal(false);
      setTeamName("");
      setTeamSlug("");
      setTeamDescription("");
    },
  });

  const inviteMutation = api.teams.invite.useMutation({
    onSuccess: (invite) => {
      utils.teams.getMyTeams.invalidate();
      setInviteLink(`/teams/invite/${invite.token}`);
    },
  });

  const addCreditsMutation = api.teams.addCredits.useMutation({
    onSuccess: () => {
      utils.teams.getMyTeams.invalidate();
      utils.credits.getBalance.invalidate();
      setShowAddCreditsModal(null);
      setCreditsAmount(100);
    },
  });

  const leaveTeamMutation = api.teams.leave.useMutation({
    onSuccess: () => {
      utils.teams.getMyTeams.invalidate();
    },
  });

  const joinByCodeMutation = api.teams.joinByCode.useMutation({
    onSuccess: (data) => {
      void utils.teams.getMyTeams.invalidate();
      setShowJoinModal(false);
      setJoinCode("");
      router.push(`/teams/${data.teamSlug}`);
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 30);
  };

  const summary = useMemo(() => {
    const teams = teamsQuery.data ?? [];
    return teams.reduce(
      (acc, team) => {
        acc.totalCredits += team.credits;
        acc.totalMembers += team._count.members;
        return acc;
      },
      { totalCredits: 0, totalMembers: 0 },
    );
  }, [teamsQuery.data]);

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Workspace</p>
            <div className="mt-2 text-sm text-white/60">
              {teamsQuery.data?.length ?? 0} team{teamsQuery.data?.length !== 1 ? "s" : ""} connected
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Join with Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-white/40">Total Teams</p>
            <p className="mt-1 text-xl font-semibold text-white">{teamsQuery.data?.length ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-white/40">Team Credits</p>
            <p className="mt-1 text-xl font-semibold text-white">{summary.totalCredits}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-white/40">Members Across Teams</p>
            <p className="mt-1 text-xl font-semibold text-white">{summary.totalMembers}</p>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {teamsQuery.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : teamsQuery.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
          <div className="rounded-full bg-white/5 p-4">
            <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="mt-4 font-medium text-white">No Teams Yet</h3>
          <p className="mt-2 text-sm text-white/50">Create a team to start collaborating</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
          >
            Create Your First Team
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="mt-3 rounded-full border border-white/10 px-6 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            Join with Team Code
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teamsQuery.data?.map((team) => (
            <div
              key={team.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]"
            >
              {/* Header */}
              <div className="relative h-24 bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  {team.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.logo} alt={team.name} className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-2xl font-semibold text-white">
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_STYLES[team.role as TeamRole]?.bg} ${ROLE_STYLES[team.role as TeamRole]?.text}`}>
                  {team.role.toLowerCase()}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5">
                <Link href={`/teams/${team.slug}`} className="group/link">
                  <h3 className="font-medium text-white group-hover/link:underline">
                    {team.name}
                  </h3>
                </Link>
                {team.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-white/50">{team.description}</p>
                )}
                
                <div className="mt-4 flex items-center gap-4 text-sm text-white/40">
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m12 5.197v-1a3 3 0 00-3-3h-6" />
                    </svg>
                    {team._count.members}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {team.credits}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-4">
                  {(team.role === "OWNER" || team.role === "ADMIN") && (
                    <>
                      <button
                        onClick={() => {
                          setShowInviteModal(team.id);
                          setInviteLink(null);
                        }}
                        className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
                      >
                        Invite
                      </button>
                      <button
                        onClick={() => setShowAddCreditsModal(team.id)}
                        className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
                      >
                        Add Credits
                      </button>
                    </>
                  )}
                  {team.role !== "OWNER" && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to leave this team?")) {
                          leaveTeamMutation.mutate({ teamId: team.id });
                        }
                      }}
                      className="flex-1 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Create Team</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/40 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    if (!teamSlug || teamSlug === generateSlug(teamName)) {
                      setTeamSlug(generateSlug(e.target.value));
                    }
                  }}
                  placeholder="Acme Corp"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/40">/teams/</span>
                  <input
                    type="text"
                    value={teamSlug}
                    onChange={(e) => setTeamSlug(generateSlug(e.target.value))}
                    placeholder="acme-corp"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Description (optional)</label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="What's this team for?"
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>

            {createTeamMutation.error && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {createTeamMutation.error.message}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createTeamMutation.mutate({
                  name: teamName,
                  slug: teamSlug,
                  description: teamDescription || undefined,
                })}
                disabled={createTeamMutation.isPending || !teamName || !teamSlug}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {createTeamMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Creating...
                  </>
                ) : (
                  "Create Team"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Join Team</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode("");
                }}
                className="text-white/40 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <label className="text-sm font-medium text-white/70">Team Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="example-team-code"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30"
              />
              <p className="text-xs text-white/40">Ask your team admin for the team code.</p>
            </div>

            {joinByCodeMutation.error && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {joinByCodeMutation.error.message}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode("");
                }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => joinByCodeMutation.mutate({ code: joinCode })}
                disabled={joinByCodeMutation.isPending || !joinCode.trim()}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {joinByCodeMutation.isPending ? "Joining..." : "Join Team"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Invite Member</h2>
              <button
                onClick={() => setShowInviteModal(null)}
                className="text-white/40 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Role</label>
                <div className="flex gap-2">
                  {(["MEMBER", "ADMIN"] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setInviteRole(role)}
                      className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                        inviteRole === role
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {role === "MEMBER" ? "Member" : "Admin"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40">
                  {inviteRole === "ADMIN" ? "Admins can invite members and add credits" : "Members can use team credits"}
                </p>
              </div>
            </div>

            {inviteLink && (
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs text-emerald-300">Invite link created. Share this with your teammate:</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-emerald-200">
                    {inviteLink}
                  </code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}${inviteLink}`);
                    }}
                    className="rounded-md border border-emerald-400/30 px-2 py-1 text-xs text-emerald-200 transition hover:bg-emerald-400/10"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {inviteMutation.error && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {inviteMutation.error.message}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(null);
                  setInviteEmail("");
                  setInviteRole("MEMBER");
                  setInviteLink(null);
                }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => inviteMutation.mutate({
                  teamId: showInviteModal,
                  email: inviteEmail,
                  role: inviteRole,
                })}
                disabled={inviteMutation.isPending || !inviteEmail}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {inviteMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Sending...
                  </>
                ) : (
                  "Create Invite Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Credits Modal */}
      {showAddCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Transfer Credits</h2>
              <button
                onClick={() => setShowAddCreditsModal(null)}
                className="text-white/40 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/50">Your Balance</div>
                <div className="text-2xl font-semibold text-white">
                  {creditsQuery.data?.credits ?? 0} credits
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Amount to Transfer</label>
                <input
                  type="number"
                  min="1"
                  max={creditsQuery.data?.credits ?? 0}
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
                />
              </div>
              
              <div className="flex gap-2">
                {[50, 100, 250, 500].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCreditsAmount(Math.min(amount, creditsQuery.data?.credits ?? 0))}
                    className="flex-1 rounded-lg border border-white/10 px-2 py-2 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {addCreditsMutation.error && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {addCreditsMutation.error.message}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddCreditsModal(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => addCreditsMutation.mutate({
                  teamId: showAddCreditsModal,
                  amount: creditsAmount,
                })}
                disabled={addCreditsMutation.isPending || creditsAmount < 1 || creditsAmount > (creditsQuery.data?.credits ?? 0)}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {addCreditsMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Transferring...
                  </>
                ) : (
                  `Transfer ${creditsAmount} Credits`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
