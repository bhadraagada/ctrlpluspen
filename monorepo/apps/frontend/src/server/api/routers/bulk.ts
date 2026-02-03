import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { inngest } from "~/inngest/client";

export const bulkRouter = createTRPCRouter({
  // Create a new bulk job from CSV data
  createJob: protectedProcedure
    .input(
      z.object({
        name: z.string().max(100).optional(),
        sourceFileName: z.string(),
        rows: z.array(
          z.object({
            text: z.string(),
            filename: z.string().optional(),
          })
        ).min(1).max(500),
        textColumn: z.string(),
        filenameColumn: z.string().optional(),
        style: z.number().min(0).max(12).default(9),
        bias: z.number().min(0).max(1.25).default(0.75),
        strokeColor: z.string().default("#000000"),
        strokeWidth: z.number().min(1).max(5).default(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const creditsNeeded = input.rows.length;
      
      // Check credits
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { credits: true },
      });

      if (!user || user.credits < creditsNeeded) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient credits. Need ${creditsNeeded}, have ${user?.credits ?? 0}`,
        });
      }

      // Create bulk job
      const bulkJob = await ctx.db.bulkJob.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          sourceFileName: input.sourceFileName,
          textColumn: input.textColumn,
          filenameColumn: input.filenameColumn,
          totalRows: input.rows.length,
          style: input.style,
          bias: input.bias,
          strokeColor: input.strokeColor,
          strokeWidth: input.strokeWidth,
          status: "PENDING",
          items: {
            create: input.rows.map((row, index) => ({
              rowIndex: index,
              text: row.text,
              outputFilename: row.filename ?? `output-${index + 1}.svg`,
              status: "PENDING",
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Deduct credits upfront
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { credits: { decrement: creditsNeeded } },
      });

      // Update credits used
      await ctx.db.bulkJob.update({
        where: { id: bulkJob.id },
        data: { creditsUsed: creditsNeeded },
      });

      // Trigger Inngest function to process bulk job
      await inngest.send({
        name: "bulk/job.created",
        data: {
          jobId: bulkJob.id,
          userId: ctx.session.user.id,
        },
      });

      return bulkJob;
    }),

  // Get all bulk jobs for current user
  getJobs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.bulkJob.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.status && { status: input.status }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (jobs.length > input.limit) {
        const nextItem = jobs.pop();
        nextCursor = nextItem?.id;
      }

      return { items: jobs, nextCursor };
    }),

  // Get a single bulk job with its items
  getJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.bulkJob.findUnique({
        where: { id: input.id },
        include: {
          items: {
            orderBy: { rowIndex: "asc" },
          },
        },
      });

      if (!job || job.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      return job;
    }),

  // Cancel a pending/processing job
  cancelJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.bulkJob.findUnique({
        where: { id: input.id },
      });

      if (!job || job.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.status === "COMPLETED" || job.status === "CANCELLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel this job" });
      }

      // Refund unused credits
      const pendingItems = await ctx.db.bulkJobItem.count({
        where: {
          bulkJobId: job.id,
          status: "PENDING",
        },
      });

      if (pendingItems > 0) {
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { credits: { increment: pendingItems } },
        });
      }

      // Update job status
      await ctx.db.bulkJob.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });

      // Cancel pending items
      await ctx.db.bulkJobItem.updateMany({
        where: {
          bulkJobId: job.id,
          status: "PENDING",
        },
        data: { status: "FAILED", errorMessage: "Job cancelled" },
      });

      return { success: true, refundedCredits: pendingItems };
    }),

  // Delete a job and its items
  deleteJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.bulkJob.findUnique({
        where: { id: input.id },
      });

      if (!job || job.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      await ctx.db.bulkJob.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // Get job statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [total, completed, processing, failed] = await Promise.all([
      ctx.db.bulkJob.count({ where: { userId: ctx.session.user.id } }),
      ctx.db.bulkJob.count({ where: { userId: ctx.session.user.id, status: "COMPLETED" } }),
      ctx.db.bulkJob.count({ where: { userId: ctx.session.user.id, status: "PROCESSING" } }),
      ctx.db.bulkJob.count({ where: { userId: ctx.session.user.id, status: "FAILED" } }),
    ]);

    const totalItems = await ctx.db.bulkJobItem.count({
      where: { bulkJob: { userId: ctx.session.user.id } },
    });

    const completedItems = await ctx.db.bulkJobItem.count({
      where: { bulkJob: { userId: ctx.session.user.id }, status: "COMPLETED" },
    });

    return {
      totalJobs: total,
      completedJobs: completed,
      processingJobs: processing,
      failedJobs: failed,
      totalItems,
      completedItems,
    };
  }),
});
