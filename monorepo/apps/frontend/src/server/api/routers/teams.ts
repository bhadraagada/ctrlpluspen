import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const teamsRouter = createTRPCRouter({
  // Create a new team
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if slug is taken
      const existing = await ctx.db.team.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Team slug already taken" });
      }

      // Create team with current user as owner
      const team = await ctx.db.team.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "OWNER",
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      });

      return team;
    }),

  // Get teams the current user is a member of
  getMyTeams: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.teamMember.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        team: {
          include: {
            _count: {
              select: { members: true, generations: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => ({
      ...m.team,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }),

  // Get a single team by slug
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { slug: input.slug },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          },
          invites: {
            where: { acceptedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: { generations: true },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      // Check if user is a member
      const isMember = team.members.some((m) => m.userId === ctx.session.user.id);
      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this team" });
      }

      const currentMember = team.members.find((m) => m.userId === ctx.session.user.id);

      return {
        ...team,
        currentUserRole: currentMember?.role,
      };
    }),

  // Update team details
  update: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        name: z.string().min(2).max(50).optional(),
        description: z.string().max(500).optional(),
        logo: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin/owner
      const member = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update team details" });
      }

      const team = await ctx.db.team.update({
        where: { id: input.teamId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.logo && { logo: input.logo }),
        },
      });

      return team;
    }),

  // Invite a user to the team
  invite: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin/owner
      const member = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can invite members" });
      }

      // Check if email is already a member
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        const existingMember = await ctx.db.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: input.teamId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMember) {
          throw new TRPCError({ code: "CONFLICT", message: "User is already a member" });
        }
      }

      // Check for existing pending invite
      const existingInvite = await ctx.db.teamInvite.findFirst({
        where: {
          teamId: input.teamId,
          email: input.email,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvite) {
        throw new TRPCError({ code: "CONFLICT", message: "Invite already pending for this email" });
      }

      // Create invite (expires in 7 days)
      const invite = await ctx.db.teamInvite.create({
        data: {
          teamId: input.teamId,
          email: input.email,
          role: input.role,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // TODO: Send email with invite link

      return invite;
    }),

  // Accept an invite
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.teamInvite.findUnique({
        where: { token: input.token },
        include: { team: true },
      });

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite already accepted" });
      }

      if (invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
      }

      // Check if invite email matches user email
      if (invite.email !== ctx.session.user.email) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invite is for a different email" });
      }

      // Check if already a member
      const existingMember = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: invite.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({ code: "CONFLICT", message: "Already a member of this team" });
      }

      // Add member and mark invite as accepted
      await ctx.db.$transaction([
        ctx.db.teamMember.create({
          data: {
            teamId: invite.teamId,
            userId: ctx.session.user.id,
            role: invite.role,
          },
        }),
        ctx.db.teamInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        }),
      ]);

      return { success: true, team: invite.team };
    }),

  // Join a team directly using team code (team slug)
  joinByCode: protectedProcedure
    .input(
      z.object({
        code: z.string().min(2).max(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedCode = input.code.trim().toLowerCase();

      const team = await ctx.db.team.findUnique({
        where: { slug: normalizedCode },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team code is invalid" });
      }

      const existingMember = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: team.id,
            userId: ctx.session.user.id,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({ code: "CONFLICT", message: "You are already a member of this team" });
      }

      await ctx.db.teamMember.create({
        data: {
          teamId: team.id,
          userId: ctx.session.user.id,
          role: "MEMBER",
        },
      });

      return { success: true, teamSlug: team.slug, teamName: team.name };
    }),

  // Cancel an invite
  cancelInvite: protectedProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.teamInvite.findUnique({
        where: { id: input.inviteId },
      });

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      // Check if user is admin/owner of the team
      const member = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: invite.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can cancel invites" });
      }

      await ctx.db.teamInvite.delete({ where: { id: input.inviteId } });

      return { success: true };
    }),

  // Remove a member from the team
  removeMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is admin/owner
      const currentMember = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can remove members" });
      }

      // Get target member
      const targetMember = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: input.userId,
          },
        },
      });

      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      // Cannot remove owner
      if (targetMember.role === "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the owner" });
      }

      // Admins cannot remove other admins (only owner can)
      if (targetMember.role === "ADMIN" && currentMember.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can remove admins" });
      }

      await ctx.db.teamMember.delete({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: input.userId,
          },
        },
      });

      return { success: true };
    }),

  // Update member role
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
        role: z.enum(["ADMIN", "MEMBER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only owner can change roles
      const currentMember = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!currentMember || currentMember.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can change roles" });
      }

      const targetMember = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: input.userId,
          },
        },
      });

      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (targetMember.role === "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change owner role" });
      }

      await ctx.db.teamMember.update({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
      });

      return { success: true };
    }),

  // Leave a team
  leave: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Not a member of this team" });
      }

      if (member.role === "OWNER") {
        // Check if there are other members
        const memberCount = await ctx.db.teamMember.count({
          where: { teamId: input.teamId },
        });

        if (memberCount > 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Transfer ownership before leaving",
          });
        }

        // If owner is the only member, delete the team
        await ctx.db.team.delete({ where: { id: input.teamId } });
        return { success: true, teamDeleted: true };
      }

      await ctx.db.teamMember.delete({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      return { success: true, teamDeleted: false };
    }),

  // Add credits to team pool
  addCredits: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        amount: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin/owner
      const member = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can add credits" });
      }

      // Check if user has enough personal credits
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { credits: true },
      });

      if (!user || user.credits < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient personal credits" });
      }

      // Transfer credits
      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { credits: { decrement: input.amount } },
        }),
        ctx.db.team.update({
          where: { id: input.teamId },
          data: { credits: { increment: input.amount } },
        }),
      ]);

      return { success: true };
    }),

  // Get team generations
  getGenerations: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check membership
      const member = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this team" });
      }

      const generations = await ctx.db.teamGeneration.findMany({
        where: { teamId: input.teamId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (generations.length > input.limit) {
        const nextItem = generations.pop();
        nextCursor = nextItem?.id;
      }

      return { items: generations, nextCursor };
    }),
});
