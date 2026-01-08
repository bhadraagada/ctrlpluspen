import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

// API URL from environment
const API_URL = process.env.OCR_API_URL ?? "http://localhost:8000";

// Response types matching FastAPI backend
const BoundingBoxSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  confidence: z.number(),
});

const TextRegionSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  bounding_box: BoundingBoxSchema,
});

const RecognitionResponseSchema = z.object({
  text: z.string(),
  regions: z.array(TextRegionSchema),
  num_regions: z.number(),
  avg_confidence: z.number(),
  total_inference_time_ms: z.number(),
});

const HealthResponseSchema = z.object({
  status: z.string(),
  models_loaded: z.boolean(),
  device: z.string(),
});

export const ocrRouter = createTRPCRouter({
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
        models_loaded: false,
        device: "unknown",
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }),

  // Full OCR pipeline - protected, requires credits
  recognize: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string(),
        confidenceThreshold: z.number().min(0).max(1).default(0.5),
        preprocess: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
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

      // Calculate image size
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageSize = Math.ceil((base64Data.length * 3) / 4); // Approximate bytes

      try {
        // Convert base64 to blob for API call
        const buffer = Buffer.from(base64Data, "base64");
        
        const formData = new FormData();
        formData.append("image", new Blob([buffer]), "image.jpg");

        const url = new URL(`${API_URL}/recognize`);
        url.searchParams.set("confidence_threshold", input.confidenceThreshold.toString());
        url.searchParams.set("preprocess", input.preprocess.toString());

        const startTime = Date.now();
        const response = await fetch(url.toString(), {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.text();
          
          // Log failed usage
          await ctx.db.usage.create({
            data: {
              userId,
              creditsUsed: 0,
              imageSize,
              success: false,
              errorMessage: error,
            },
          });
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Recognition failed: ${error}`,
          });
        }

        const data = (await response.json()) as z.infer<typeof RecognitionResponseSchema>;
        const processingTime = Date.now() - startTime;

        // Deduct credit and log usage in a transaction
        await ctx.db.$transaction([
          ctx.db.user.update({
            where: { id: userId },
            data: { credits: { decrement: 1 } },
          }),
          ctx.db.usage.create({
            data: {
              userId,
              creditsUsed: 1,
              imageSize,
              regionsDetected: data.num_regions,
              charactersRecognized: data.text.length,
              processingTimeMs: processingTime,
              success: true,
            },
          }),
        ]);

        return {
          ...data,
          creditsRemaining: user.credits - 1,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        // Log failed usage
        await ctx.db.usage.create({
          data: {
            userId,
            creditsUsed: 0,
            imageSize,
            success: false,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "OCR processing failed",
        });
      }
    }),

  // Get usage history
  getUsageHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.usage.findMany({
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

  // Get usage stats
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [totalUsage, thisMonthUsage, user] = await Promise.all([
      ctx.db.usage.aggregate({
        where: { userId, success: true },
        _sum: { creditsUsed: true, charactersRecognized: true },
        _count: true,
      }),
      ctx.db.usage.aggregate({
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
      totalScans: totalUsage._count,
      totalCreditsUsed: totalUsage._sum.creditsUsed ?? 0,
      totalCharactersRecognized: totalUsage._sum.charactersRecognized ?? 0,
      thisMonthScans: thisMonthUsage._count,
      thisMonthCreditsUsed: thisMonthUsage._sum.creditsUsed ?? 0,
    };
  }),
});

// Export types for client usage
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
export type TextRegion = z.infer<typeof TextRegionSchema>;
export type RecognitionResponse = z.infer<typeof RecognitionResponseSchema>;
