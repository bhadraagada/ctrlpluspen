import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import { inngest } from "~/inngest/client";

// API URL from environment
const API_URL = env.SYNTHESIS_API_URL;

// Valid characters for synthesis (matching backend)
const VALID_CHARS = new Set([
  '\x00', ' ', '!', '"', '#', "'", '(', ')', ',', '-', '.',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';',
  '?', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
  'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'Y',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z'
]);

// Response types matching FastAPI backend
const StyleInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
});

const SynthesisResponseSchema = z.object({
  svg: z.string(),
  svg_raw: z.string(),
  lines_count: z.number(),
  characters_count: z.number(),
  style: z.number(),
  bias: z.number(),
});

const HealthResponseSchema = z.object({
  status: z.string(),
  model_loaded: z.boolean(),
  valid_characters: z.string(),
  max_chars_per_line: z.number(),
  max_lines: z.number(),
  available_styles: z.number(),
});

// Helper to validate text
function validateText(text: string): { valid: boolean; error?: string } {
  if (!text || !text.trim()) {
    return { valid: false, error: "Text cannot be empty" };
  }

  const lines = text.split('\n');
  if (lines.length > 20) {
    return { valid: false, error: "Maximum 20 lines allowed" };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.length > 75) {
      return { valid: false, error: `Line ${i + 1} exceeds 75 characters` };
    }

    const invalidChars = [...line].filter(c => !VALID_CHARS.has(c));
    if (invalidChars.length > 0) {
      return {
        valid: false,
        error: `Invalid characters in line ${i + 1}: ${invalidChars.join(', ')}. Note: Q, X, Z are not supported.`
      };
    }
  }

  return { valid: true };
}

export const synthesisRouter = createTRPCRouter({
  // Health check - public
  health: publicProcedure.query(async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = (await response.json()) as z.infer<typeof HealthResponseSchema>;
      return data;
    } catch (error) {
      return {
        status: "unhealthy",
        model_loaded: false,
        valid_characters: "",
        max_chars_per_line: 75,
        max_lines: 20,
        available_styles: 13,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }),

  // Get available styles - public
  getStyles: publicProcedure.query(async () => {
    try {
      const response = await fetch(`${API_URL}/styles`);
      if (!response.ok) {
        throw new Error(`Failed to get styles: ${response.status}`);
      }
      const data = (await response.json()) as z.infer<typeof StyleInfoSchema>[];
      return data;
    } catch (error) {
      // Return default styles if API is unavailable
      return [
        { id: 0, name: "Style 0", description: "Clean cursive style" },
        { id: 1, name: "Style 1", description: "Slightly slanted cursive" },
        { id: 2, name: "Style 2", description: "Rounded handwriting" },
        { id: 3, name: "Style 3", description: "Compact script" },
        { id: 4, name: "Style 4", description: "Wide spaced letters" },
        { id: 5, name: "Style 5", description: "Elegant flowing script" },
        { id: 6, name: "Style 6", description: "Quick note style" },
        { id: 7, name: "Style 7", description: "Neat print-like" },
        { id: 8, name: "Style 8", description: "Artistic flourish" },
        { id: 9, name: "Style 9", description: "Natural everyday writing" },
        { id: 10, name: "Style 10", description: "Bold confident strokes" },
        { id: 11, name: "Style 11", description: "Light delicate script" },
        { id: 12, name: "Style 12", description: "Classic formal hand" },
      ];
    }
  }),

  // Get valid characters - public
  getValidCharacters: publicProcedure.query(async () => {
    try {
      const response = await fetch(`${API_URL}/valid-characters`);
      if (!response.ok) {
        throw new Error(`Failed to get valid characters: ${response.status}`);
      }
      return await response.json() as {
        characters: string[];
        characters_string: string;
        unsupported_letters: string[];
        note: string;
      };
    } catch {
      // Return default if API unavailable
      const chars = [...VALID_CHARS].filter(c => c !== '\x00').sort();
      return {
        characters: chars,
        characters_string: chars.join(''),
        unsupported_letters: ['Q', 'X', 'Z'],
        note: "These characters are case-sensitive. Q, X, Z are not supported."
      };
    }
  }),

  // Validate text - public (for real-time validation)
  validateText: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return validateText(input.text);
    }),

  // Generate handwriting - protected, requires credits
  generate: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(1600), // ~20 lines * 75 chars + newlines
        style: z.number().min(0).max(12).default(9),
        bias: z.number().min(0).max(1.5).default(0.75),
        strokeColor: z.string().default("black"),
        strokeWidth: z.number().min(1).max(5).default(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate text first
      const validation = validateText(input.text);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error ?? "Invalid text",
        });
      }

      // Check if user has enough credits
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits. Please purchase more credits to continue.",
        });
      }

      const startTime = Date.now();
      const lines = input.text.split('\n');

      try {
        const response = await fetch(`${API_URL}/synthesize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: input.text,
            style: input.style,
            bias: input.bias,
            stroke_color: input.strokeColor,
            stroke_width: input.strokeWidth,
          }),
        });

        if (!response.ok) {
          const error = await response.text();

          // Log failed usage
          await ctx.db.synthesisUsage.create({
            data: {
              userId,
              creditsUsed: 0,
              linesCount: lines.length,
              charactersCount: input.text.length,
              style: input.style,
              bias: input.bias,
              success: false,
              errorMessage: error,
            },
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Synthesis failed: ${error}`,
          });
        }

        const data = (await response.json()) as z.infer<typeof SynthesisResponseSchema>;
        const processingTime = Date.now() - startTime;

        // Deduct credit and log usage in a transaction
        await ctx.db.$transaction([
          ctx.db.user.update({
            where: { id: userId },
            data: { credits: { decrement: 1 } },
          }),
          ctx.db.synthesisUsage.create({
            data: {
              userId,
              creditsUsed: 1,
              linesCount: data.lines_count,
              charactersCount: data.characters_count,
              style: data.style,
              bias: data.bias,
              processingTimeMs: processingTime,
              success: true,
            },
          }),
        ]);

        return {
          svg: data.svg,
          svgRaw: data.svg_raw,
          linesCount: data.lines_count,
          charactersCount: data.characters_count,
          style: data.style,
          bias: data.bias,
          creditsRemaining: user.credits - 1,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        // Log failed usage
        await ctx.db.synthesisUsage.create({
          data: {
            userId,
            creditsUsed: 0,
            linesCount: lines.length,
            charactersCount: input.text.length,
            style: input.style,
            bias: input.bias,
            success: false,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Synthesis processing failed",
        });
      }
    }),

  // Batch generate handwriting with multiple styles/settings (async via Inngest)
  batchGenerate: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(1600),
        variants: z.array(
          z.object({
            style: z.number().min(0).max(12),
            bias: z.number().min(0).max(1.5),
            strokeColor: z.string().default("black"),
            strokeWidth: z.number().min(1).max(5).default(2),
          })
        ).min(1).max(13), // Max 13 variants (one per style)
        jobName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const variantCount = input.variants.length;

      // Validate text first
      const validation = validateText(input.text);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error ?? "Invalid text",
        });
      }

      // Check if user has enough credits
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < variantCount) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Insufficient credits. You need ${variantCount} credits but have ${user?.credits ?? 0}.`,
        });
      }

      // Create batch job with PENDING status
      const batchJob = await ctx.db.batchJob.create({
        data: {
          userId,
          name: input.jobName ?? `Batch ${new Date().toLocaleString()}`,
          text: input.text,
          totalVariants: variantCount,
          creditsUsed: 0, // Will be updated as variants complete
          status: "PENDING",
        },
      });

      // Create SavedGeneration records upfront with PENDING status
      // This allows the gallery to show progress in real-time
      const generationIds: string[] = [];
      for (const variant of input.variants) {
        const generation = await ctx.db.savedGeneration.create({
          data: {
            userId,
            text: input.text,
            style: variant.style,
            bias: variant.bias,
            strokeColor: variant.strokeColor,
            strokeWidth: variant.strokeWidth,
            status: "PENDING",
            batchJobId: batchJob.id,
            tags: ["batch"],
          },
        });
        generationIds.push(generation.id);
      }

      // Trigger Inngest function to process batch asynchronously
      await inngest.send({
        name: "synthesis/batch.requested",
        data: {
          batchJobId: batchJob.id,
          userId,
          text: input.text,
          variants: input.variants,
          generationIds,
        },
      });

      // Return immediately with job ID for polling
      return {
        batchJobId: batchJob.id,
        status: "PENDING",
        totalVariants: variantCount,
        generationIds,
        message: "Batch job queued for processing",
      };
    }),

  // Get batch job status (for polling)
  getBatchJobStatus: protectedProcedure
    .input(z.object({ batchJobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.batchJob.findFirst({
        where: {
          id: input.batchJobId,
          userId: ctx.session.user.id,
        },
        include: {
          generations: true,
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Batch job not found",
        });
      }

      return {
        id: job.id,
        status: job.status,
        totalVariants: job.totalVariants,
        completedCount: job.completedCount,
        creditsUsed: job.creditsUsed,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        generations: job.generations,
        results: job.results, // JSON array of variant results with SVG data
      };
    }),

  // Get user's batch job history
  getBatchJobs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.batchJob.findMany({
        where: { userId: ctx.session.user.id },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { generations: true },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (jobs.length > input.limit) {
        const nextItem = jobs.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: jobs,
        nextCursor,
      };
    }),

  // Get synthesis usage history
  getUsageHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.synthesisUsage.findMany({
        where: { userId: ctx.session.user.id },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get synthesis usage stats
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [totalUsage, thisMonthUsage, user] = await Promise.all([
      ctx.db.synthesisUsage.aggregate({
        where: { userId, success: true },
        _sum: { creditsUsed: true, charactersCount: true, linesCount: true },
        _count: true,
      }),
      ctx.db.synthesisUsage.aggregate({
        where: {
          userId,
          success: true,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { creditsUsed: true },
        _count: true,
      }),
      ctx.db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      }),
    ]);

    return {
      credits: user?.credits ?? 0,
      totalGenerations: totalUsage._count,
      totalCreditsUsed: totalUsage._sum.creditsUsed ?? 0,
      totalCharactersGenerated: totalUsage._sum.charactersCount ?? 0,
      totalLinesGenerated: totalUsage._sum.linesCount ?? 0,
      thisMonthGenerations: thisMonthUsage._count,
      thisMonthCreditsUsed: thisMonthUsage._sum.creditsUsed ?? 0,
    };
  }),

  // ==================== GALLERY METHODS ====================

  // Save a generation to the gallery
  saveGeneration: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        style: z.number(),
        bias: z.number(),
        strokeColor: z.string().default("black"),
        strokeWidth: z.number().default(2),
        fileUrl: z.string().url(),
        fileKey: z.string(),
        fileName: z.string().optional(),
        linesCount: z.number(),
        charactersCount: z.number(),
        tags: z.array(z.string()).default([]),
        batchJobId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const savedGeneration = await ctx.db.savedGeneration.create({
        data: {
          userId: ctx.session.user.id,
          text: input.text,
          style: input.style,
          bias: input.bias,
          strokeColor: input.strokeColor,
          strokeWidth: input.strokeWidth,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          fileName: input.fileName,
          linesCount: input.linesCount,
          charactersCount: input.charactersCount,
          tags: input.tags,
          batchJobId: input.batchJobId,
        },
      });

      return savedGeneration;
    }),

  // Get paginated gallery of saved generations
  getGallery: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        favoritesOnly: z.boolean().default(false),
        tag: z.string().optional(),
        style: z.number().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["newest", "oldest", "style"]).default("newest"),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: {
        userId: string;
        isFavorite?: boolean;
        tags?: { has: string };
        style?: number;
        text?: { contains: string; mode: "insensitive" };
      } = {
        userId: ctx.session.user.id,
      };

      if (input.favoritesOnly) {
        where.isFavorite = true;
      }
      if (input.tag) {
        where.tags = { has: input.tag };
      }
      if (input.style !== undefined) {
        where.style = input.style;
      }
      if (input.search) {
        where.text = { contains: input.search, mode: "insensitive" };
      }

      const orderBy =
        input.sortBy === "newest"
          ? { createdAt: "desc" as const }
          : input.sortBy === "oldest"
            ? { createdAt: "asc" as const }
            : { style: "asc" as const };

      const items = await ctx.db.savedGeneration.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get single saved generation
  getGeneration: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const generation = await ctx.db.savedGeneration.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!generation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Generation not found",
        });
      }

      return generation;
    }),

  // Delete a saved generation
  deleteGeneration: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const generation = await ctx.db.savedGeneration.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!generation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Generation not found",
        });
      }

      // Delete from database (UploadThing file cleanup can be done separately)
      await ctx.db.savedGeneration.delete({
        where: { id: input.id },
      });

      return { success: true, fileKey: generation.fileKey };
    }),

  // Toggle favorite status
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const generation = await ctx.db.savedGeneration.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!generation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Generation not found",
        });
      }

      const updated = await ctx.db.savedGeneration.update({
        where: { id: input.id },
        data: { isFavorite: !generation.isFavorite },
      });

      return updated;
    }),

  // Update tags on a generation
  updateTags: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tags: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const generation = await ctx.db.savedGeneration.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!generation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Generation not found",
        });
      }

      const updated = await ctx.db.savedGeneration.update({
        where: { id: input.id },
        data: { tags: input.tags },
      });

      return updated;
    }),

  // Get all unique tags used by the user
  getAllTags: protectedProcedure.query(async ({ ctx }) => {
    const generations = await ctx.db.savedGeneration.findMany({
      where: { userId: ctx.session.user.id },
      select: { tags: true },
    });

    const allTags = new Set<string>();
    generations.forEach((g) => g.tags.forEach((t) => allTags.add(t)));

    return Array.from(allTags).sort();
  }),

  // Get gallery stats
  getGalleryStats: protectedProcedure.query(async ({ ctx }) => {
    const [total, favorites, byStyle] = await Promise.all([
      ctx.db.savedGeneration.count({
        where: { userId: ctx.session.user.id },
      }),
      ctx.db.savedGeneration.count({
        where: { userId: ctx.session.user.id, isFavorite: true },
      }),
      ctx.db.savedGeneration.groupBy({
        by: ["style"],
        where: { userId: ctx.session.user.id },
        _count: true,
      }),
    ]);

    return {
      total,
      favorites,
      byStyle: byStyle.map((s) => ({ style: s.style, count: s._count })),
    };
  }),
});

// Export types for client usage
export type StyleInfo = z.infer<typeof StyleInfoSchema>;
export type SynthesisResponse = z.infer<typeof SynthesisResponseSchema>;
