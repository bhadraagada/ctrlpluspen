"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

const ROLE_STYLES: Record<TeamRole, { bg: string; text: string }> = {
  OWNER: { bg: "bg-amber-500/20", text: "text-amber-400" },
  ADMIN: { bg: "bg-purple-500/20", text: "text-purple-400" },
  MEMBER: { bg: "bg-blue-500/20", text: "text-blue-400" },
};

interface TeamDetailProps {
  slug: string;
}

export function TeamDetail({ slug }: TeamDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"members" | "invites" | "generations" | "settings">("members");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  
  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  
  // Add credits form
  const [creditsAmount, setCreditsAmount] = useState(100);
  
  // Settings form
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [expandedGenerationId, setExpandedGenerationId] = useState<string | null>(null);

  const utils = api.useUtils();
  const teamQuery = api.teams.getBySlug.useQuery({ slug });
  const generationsQuery = api.teams.getGenerations.useQuery(
    { teamId: teamQuery.data?.id ?? "" },
    { enabled: !!teamQuery.data?.id && activeTab === "generations" }
  );
  const creditsQuery = api.credits.getBalance.useQuery();

  const inviteMutation = api.teams.invite.useMutation({
    onSuccess: (invite) => {
      utils.teams.getBySlug.invalidate({ slug });
      setInviteLink(`/teams/invite/${invite.token}`);
    },
  });

  const cancelInviteMutation = api.teams.cancelInvite.useMutation({
    onSuccess: () => {
      utils.teams.getBySlug.invalidate({ slug });
    },
  });

  const removeMemberMutation = api.teams.removeMember.useMutation({
    onSuccess: () => {
      utils.teams.getBySlug.invalidate({ slug });
    },
  });

  const updateRoleMutation = api.teams.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.teams.getBySlug.invalidate({ slug });
    },
  });

  const addCreditsMutation = api.teams.addCredits.useMutation({
    onSuccess: () => {
      utils.teams.getBySlug.invalidate({ slug });
      utils.credits.getBalance.invalidate();
      setShowAddCreditsModal(false);
      setCreditsAmount(100);
    },
  });

  const updateTeamMutation = api.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.getBySlug.invalidate({ slug });
    },
  });

  const leaveTeamMutation = api.teams.leave.useMutation({
    onSuccess: (data) => {
      if (data.teamDeleted) {
        router.push("/teams");
      } else {
        router.push("/teams");
      }
    },
  });

  const team = teamQuery.data;
  const isAdmin = team?.currentUserRole === "OWNER" || team?.currentUserRole === "ADMIN";
  const isOwner = team?.currentUserRole === "OWNER";

  if (teamQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (teamQuery.error || !team) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
        <div className="rounded-full bg-red-500/20 p-4">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="mt-4 font-medium text-white">Team Not Found</h3>
        <p className="mt-2 text-sm text-white/50">{teamQuery.error?.message ?? "This team doesn't exist or you don't have access"}</p>
        <Link
          href="/teams"
          className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
        >
          Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/teams" className="text-white/40 hover:text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          
          {team.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo} alt={team.name} className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 text-xl font-semibold text-white">
              {team.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">{team.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[team.currentUserRole as TeamRole]?.bg} ${ROLE_STYLES[team.currentUserRole as TeamRole]?.text}`}>
                {team.currentUserRole?.toLowerCase()}
              </span>
            </div>
            {team.description && (
              <p className="mt-1 text-sm text-white/50">{team.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2">
            <div className="text-lg font-semibold text-white">{team.credits}</div>
            <div className="text-xs text-white/40">Team Credits</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Team Code</span>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(team.slug);
                }}
                className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Copy
              </button>
            </div>
            <div className="text-sm font-semibold uppercase tracking-wide text-white">{team.slug}</div>
          </div>

          <Link
            href={`/synthesis?team=${team.id}`}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Generate for Team
          </Link>
          
          {isAdmin && (
            <button
              onClick={() => setShowAddCreditsModal(true)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Add Credits
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1 w-fit">
        {[
          { key: "members", label: `Members (${team.members.length})` },
          { key: "invites", label: `Invites (${team.invites.length})` },
          { key: "generations", label: `Generations (${team._count.generations})` },
          ...(isOwner ? [{ key: "settings", label: "Settings" }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-medium text-white">Team Members</h2>
            {isAdmin && (
              <button
                onClick={() => {
                  setInviteLink(null);
                  setShowInviteModal(true);
                }}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite
              </button>
            )}
          </div>

          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
            {team.members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {member.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.user.image}
                      alt={member.user.name ?? ""}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                      {member.user.name?.[0] ?? member.user.email?.[0] ?? "?"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{member.user.name ?? "Unnamed"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_STYLES[member.role as TeamRole]?.bg} ${ROLE_STYLES[member.role as TeamRole]?.text}`}>
                        {member.role.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-sm text-white/40">{member.user.email}</div>
                  </div>
                </div>

                {isOwner && member.role !== "OWNER" && (
                  <div className="flex gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => {
                        updateRoleMutation.mutate({
                          teamId: team.id,
                          userId: member.userId,
                          role: e.target.value as "ADMIN" | "MEMBER",
                        });
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="MEMBER" className="bg-[#0a0a0a]">Member</option>
                      <option value="ADMIN" className="bg-[#0a0a0a]">Admin</option>
                    </select>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${member.user.name ?? member.user.email} from the team?`)) {
                          removeMemberMutation.mutate({ teamId: team.id, userId: member.userId });
                        }
                      }}
                      className="rounded-lg border border-red-500/20 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "invites" && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-medium text-white">Pending Invites</h2>
            {isAdmin && (
              <button
                onClick={() => {
                  setInviteLink(null);
                  setShowInviteModal(true);
                }}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite
              </button>
            )}
          </div>

          {team.invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center">
              <div className="rounded-full bg-white/5 p-3">
                <svg className="h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mt-3 text-sm text-white/50">No pending invites</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
              {team.invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{invite.email}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_STYLES[invite.role as TeamRole]?.bg} ${ROLE_STYLES[invite.role as TeamRole]?.text}`}>
                        {invite.role.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-sm text-white/40">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => cancelInviteMutation.mutate({ inviteId: invite.id })}
                      disabled={cancelInviteMutation.isPending}
                      className="rounded-lg border border-red-500/20 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "generations" && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Team Generations</h2>

          {generationsQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : generationsQuery.data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center">
              <div className="rounded-full bg-white/5 p-3">
                <svg className="h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="mt-3 text-sm text-white/50">No generations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
              {generationsQuery.data?.items.map((gen) => (
                <div key={gen.id}>
                  <div
                    onClick={() => {
                      if (!gen.svgContent && !gen.fileUrl) return;
                      setExpandedGenerationId((current) => (current === gen.id ? null : gen.id));
                    }}
                    className={`flex items-center justify-between p-4 ${gen.svgContent || gen.fileUrl ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      {gen.createdBy.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={gen.createdBy.image}
                          alt={gen.createdBy.name ?? ""}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white">
                          {gen.createdBy.name?.[0] ?? "?"}
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-white line-clamp-1">{gen.text}</div>
                        <div className="text-xs text-white/40">
                          {gen.createdBy.name} - {new Date(gen.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(gen.svgContent || gen.fileUrl) && (
                        <span className="text-xs text-white/50">
                          {expandedGenerationId === gen.id ? "Hide" : "Preview"}
                        </span>
                      )}

                      {gen.fileUrl ? (
                        <a
                          href={gen.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                        >
                          Open
                        </a>
                      ) : gen.svgContent ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const svgMarkup = gen.svgContent;
                            if (!svgMarkup) return;
                            const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
                            const url = URL.createObjectURL(blob);
                            window.open(url, "_blank", "noopener,noreferrer");
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          }}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                        >
                          Open SVG
                        </button>
                      ) : (
                        <span className="text-xs text-white/40">Not saved as file</span>
                      )}
                    </div>
                  </div>

                  {expandedGenerationId === gen.id && (gen.svgContent || gen.fileUrl) && (
                    <div className="px-4 pb-4">
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-white p-3">
                        {gen.svgContent ? (
                          <div className="max-h-72 overflow-auto" dangerouslySetInnerHTML={{ __html: gen.svgContent }} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={gen.fileUrl!} alt="Team generation preview" className="max-h-72 w-full object-contain" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && isOwner && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-white">Team Settings</h2>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Team Name</label>
              <input
                type="text"
                defaultValue={team.name}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Description</label>
              <textarea
                defaultValue={team.description ?? ""}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30 resize-none"
              />
            </div>

            <button
              onClick={() => {
                updateTeamMutation.mutate({
                  teamId: team.id,
                  name: editName || undefined,
                  description: editDescription || undefined,
                });
              }}
              disabled={updateTeamMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <h3 className="font-medium text-red-400">Danger Zone</h3>
            <p className="mt-2 text-sm text-white/50">
              Leaving as the only owner will delete the team and all its data.
            </p>
            <button
              onClick={() => {
                if (confirm("Are you sure? This action cannot be undone.")) {
                  leaveTeamMutation.mutate({ teamId: team.id });
                }
              }}
              disabled={leaveTeamMutation.isPending}
              className="mt-4 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
            >
              {team.members.length === 1 ? "Delete Team" : "Leave Team"}
            </button>
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
                onClick={() => setShowInviteModal(false)}
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
                  setShowInviteModal(false);
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
                  teamId: team.id,
                  email: inviteEmail,
                  role: inviteRole,
                })}
                disabled={inviteMutation.isPending || !inviteEmail}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {inviteMutation.isPending ? "Creating..." : "Create Invite Link"}
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
                onClick={() => setShowAddCreditsModal(false)}
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
                onClick={() => setShowAddCreditsModal(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => addCreditsMutation.mutate({
                  teamId: team.id,
                  amount: creditsAmount,
                })}
                disabled={addCreditsMutation.isPending || creditsAmount < 1 || creditsAmount > (creditsQuery.data?.credits ?? 0)}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {addCreditsMutation.isPending ? "Transferring..." : `Transfer ${creditsAmount} Credits`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
