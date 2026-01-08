import { inngest } from "./client";
import { db } from "~/server/db";

const SYNTHESIS_API_URL = process.env.SYNTHESIS_API_URL ?? "http://localhost:8001";

// Response type from synthesis API
interface SynthesisResponse {
  svg: string;
  svg_raw: string;
  lines_count: number;
  characters_count: number;
  style: number;
  bias: number;
}

/**
 * Batch Synthesis Function
 * 
 * This function processes batch handwriting synthesis requests asynchronously.
 * Each variant is saved to the gallery immediately with status updates:
 * - PENDING: Waiting to be processed
 * - GENERATING: Currently being generated
 * - COMPLETED: Successfully generated
 * - FAILED: Generation failed
 */
export const processBatchSynthesis = inngest.createFunction(
  {
    id: "process-batch-synthesis",
    retries: 3,
    concurrency: {
      limit: 2,
      key: "event.data.userId",
    },
  },
  { event: "synthesis/batch.requested" },
  async ({ event, step }) => {
    const { batchJobId, userId, text, variants, generationIds } = event.data;

    // Update batch job status to PROCESSING
    await step.run("update-status-processing", async () => {
      await db.batchJob.update({
        where: { id: batchJobId },
        data: { status: "PROCESSING" },
      });
    });

    let successCount = 0;

    // Process each variant as a separate step
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]!;
      const generationId = generationIds[i]!;

      // Mark as GENERATING
      await step.run(`mark-generating-${i}`, async () => {
        await db.savedGeneration.update({
          where: { id: generationId },
          data: { status: "GENERATING" },
        });
      });

      // Generate the handwriting
      const result = await step.run(`generate-variant-${i}`, async () => {
        try {
          const response = await fetch(`${SYNTHESIS_API_URL}/synthesize`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              style: variant.style,
              bias: variant.bias,
              stroke_color: variant.strokeColor,
              stroke_width: variant.strokeWidth,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false as const, error: errorText };
          }

          const data = (await response.json()) as SynthesisResponse;
          return {
            success: true as const,
            svgRaw: data.svg_raw,
            linesCount: data.lines_count,
            charactersCount: data.characters_count,
          };
        } catch (error) {
          return {
            success: false as const,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      // Update the generation with result
      await step.run(`save-result-${i}`, async () => {
        if (result.success) {
          await db.savedGeneration.update({
            where: { id: generationId },
            data: {
              status: "COMPLETED",
              svgContent: result.svgRaw,
              linesCount: result.linesCount,
              charactersCount: result.charactersCount,
            },
          });
          successCount++;
        } else {
          await db.savedGeneration.update({
            where: { id: generationId },
            data: {
              status: "FAILED",
              errorMessage: result.error,
            },
          });
        }

        // Update batch job progress
        await db.batchJob.update({
          where: { id: batchJobId },
          data: {
            completedCount: { increment: 1 },
          },
        });
      });

      // Deduct credit immediately for successful generation
      if (result.success) {
        await step.run(`deduct-credit-${i}`, async () => {
          await db.user.update({
            where: { id: userId },
            data: { credits: { decrement: 1 } },
          });
        });
      }
    }

    // Finalize batch job
    await step.run("finalize-batch", async () => {
      const totalCount = variants.length;

      await db.batchJob.update({
        where: { id: batchJobId },
        data: {
          status: successCount > 0 ? "COMPLETED" : "FAILED",
          creditsUsed: successCount,
          errorMessage:
            successCount < totalCount
              ? `${totalCount - successCount} of ${totalCount} variants failed`
              : undefined,
        },
      });

      // Log synthesis usage
      await db.synthesisUsage.create({
        data: {
          userId,
          creditsUsed: successCount,
          linesCount: text.split("\n").length * successCount,
          charactersCount: text.length * successCount,
          style: -1, // Indicates batch
          bias: 0,
          success: successCount > 0,
          errorMessage:
            successCount < totalCount
              ? `Batch: ${successCount}/${totalCount} succeeded`
              : undefined,
        },
      });
    });

    return {
      batchJobId,
      successCount,
      totalCount: variants.length,
    };
  }
);

// Export all functions for the serve handler
export const functions = [processBatchSynthesis];
