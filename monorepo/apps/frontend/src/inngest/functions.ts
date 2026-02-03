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

// Helper to sanitize text (remove unsupported characters)
function sanitizeText(text: string): string {
  // Replace common smart quotes and dashes
  let cleaned = text
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // Em-dashes
    .replace(/\u00A0/g, " ");        // Non-breaking space

  // Remove any other characters that aren't basic ASCII printable or newline
  // Valid range: space (32) to tilde (126), plus newline
  return cleaned.replace(/[^\x20-\x7E\n]/g, "");
}

// Helper to wrap text to max chars per line (preserving existing newlines)
function wrapText(text: string, maxChars = 75): string {
  const lines = text.split("\n");
  const wrappedLines: string[] = [];

  for (const line of lines) {
    if (line.length <= maxChars) {
      wrappedLines.push(line);
      continue;
    }

    const words = line.split(" ");
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + word).length + 1 > maxChars) {
        wrappedLines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine += word + " ";
      }
    }
    if (currentLine.trim()) {
      wrappedLines.push(currentLine.trim());
    }
  }

  return wrappedLines.join("\n");
}

// Helper to extract inner content from SVG string (removes <svg> tags)
function extractSvgContent(svg: string): string {
  // Simple regex to grab content inside <svg...>...</svg>
  const match = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  return match ? match[1]! : svg;
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

/**
 * Bulk Job Processing Function
 * 
 * Processes bulk CSV-based handwriting synthesis jobs.
 * Each row is processed with the configured style settings.
 */
export const processBulkJob = inngest.createFunction(
  {
    id: "process-bulk-job",
    retries: 3,
    concurrency: {
      limit: 5, // Process 5 items concurrently per job
      key: "event.data.jobId",
    },
  },
  { event: "bulk/job.created" },
  async ({ event, step }) => {
    const { jobId, userId } = event.data;

    // Get the job with all items
    const job = await step.run("fetch-job", async () => {
      return await db.bulkJob.findUnique({
        where: { id: jobId },
        include: { items: { orderBy: { rowIndex: "asc" } } },
      });
    });

    if (!job) {
      throw new Error(`Bulk job ${jobId} not found`);
    }

    // Update status to PROCESSING
    await step.run("mark-processing", async () => {
      await db.bulkJob.update({
        where: { id: jobId },
        data: { status: "PROCESSING" },
      });
    });

    let successCount = 0;
    let failedCount = 0;

    // Process each item
    for (const item of job.items) {
      // Mark item as generating
      await step.run(`mark-item-generating-${item.id}`, async () => {
        await db.bulkJobItem.update({
          where: { id: item.id },
          data: { status: "GENERATING" },
        });
      });

      // Generate handwriting
      const result = await step.run(`generate-item-${item.id}`, async () => {
        try {
          const response = await fetch(`${SYNTHESIS_API_URL}/synthesize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: item.text,
              style: job.style,
              bias: job.bias,
              stroke_color: job.strokeColor,
              stroke_width: job.strokeWidth,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false as const, error: errorText };
          }

          const data = (await response.json()) as SynthesisResponse;
          return {
            success: true as const,
            svgContent: data.svg_raw,
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

      // Save result
      await step.run(`save-item-result-${item.id}`, async () => {
        if (result.success) {
          await db.bulkJobItem.update({
            where: { id: item.id },
            data: {
              status: "COMPLETED",
              svgContent: result.svgContent,
              linesCount: result.linesCount,
              charactersCount: result.charactersCount,
            },
          });

          // Also create a SavedGeneration entry so it appears in the Gallery
          await db.savedGeneration.create({
            data: {
              userId,
              status: "COMPLETED",
              text: item.text,
              style: job.style,
              bias: job.bias,
              strokeColor: job.strokeColor,
              strokeWidth: job.strokeWidth,
              svgContent: result.svgContent,
              linesCount: result.linesCount,
              charactersCount: result.charactersCount,
              fileName: item.outputFilename,
              tags: [`bulk-job:${jobId}`],
            },
          });

          successCount++;
        } else {
          await db.bulkJobItem.update({
            where: { id: item.id },
            data: {
              status: "FAILED",
              errorMessage: result.error,
            },
          });
          failedCount++;
        }

        // Update job progress
        await db.bulkJob.update({
          where: { id: jobId },
          data: {
            processedCount: { increment: 1 },
          },
        });
      });
    }

    // Finalize job
    await step.run("finalize-job", async () => {
      const finalStatus = failedCount === job.items.length ? "FAILED" : "COMPLETED";
      
      await db.bulkJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          errorMessage:
            failedCount > 0
              ? `${failedCount} of ${job.items.length} items failed`
              : undefined,
        },
      });

      // Log usage
      await db.synthesisUsage.create({
        data: {
          userId,
          creditsUsed: successCount,
          linesCount: job.items.reduce((sum, item) => sum + item.text.split("\n").length, 0),
          charactersCount: job.items.reduce((sum, item) => sum + item.text.length, 0),
          style: job.style,
          bias: job.bias,
          success: successCount > 0,
          errorMessage: failedCount > 0 ? `Bulk: ${successCount}/${job.items.length} succeeded` : undefined,
        },
      });
    });

    return {
      jobId,
      successCount,
      failedCount,
      totalItems: job.items.length,
    };
  }
);


/**
 * Template Generation Function
 * 
 * Generates handwriting for template documents.
 * Composes multiple text areas into a single SVG.
 */
export const processTemplateGeneration = inngest.createFunction(
  {
    id: "process-template-generation",
    retries: 3,
    concurrency: {
      limit: 5,
      key: "event.data.userId",
    },
  },
  { event: "templates/document.generated" },
  async ({ event, step }) => {
    const { documentId, userId } = event.data;

    // Fetch document and template
    const { document, template } = await step.run("fetch-document", async () => {
      const doc = await db.templateDocument.findUnique({
        where: { id: documentId },
        include: { template: true },
      });
      if (!doc) throw new Error("Document not found");
      return { document: doc, template: doc.template };
    });

    // Parse config
    const config = template.config as any; // Typed as Json in Prisma
    const content = document.content as Record<string, string>;
    const textAreas = config.textAreas || [];

    // Get page dimensions
    const sizes: Record<string, { width: number; height: number }> = {
      A4: { width: 595, height: 842 },
      A5: { width: 420, height: 595 },
      Letter: { width: 612, height: 792 },
    };
    
    let width = config.width;
    let height = config.height;

    if (!width || !height) {
      const size = sizes[config.pageSize] || sizes.A4;
      if (config.orientation === "landscape") {
        width = size.height;
        height = size.width;
      } else {
        width = size.width;
        height = size.height;
      }
    }

    const generatedParts: string[] = [];
    let successCount = 0;

    // Sort text areas by Y position to process them in visual order
    // This allows us to implement a "flow" layout where elements push subsequent ones down
    const sortedAreas = [...textAreas].sort((a, b) => a.y - b.y);
    
    // Track the bottom-most Y coordinate reached so far
    let currentBottomY = 0;
    const verticalPadding = 20; // Space between elements

    // Process each text area
    for (const area of sortedAreas) {
      const rawText = content[area.id];
      if (!rawText || !rawText.trim()) continue;

      // Calculate wrapping limit based on area width
      // Lowering estimate to 6 to allow significantly more characters (approx 12-14 words per line)
      const charWidthEstimate = 6; 
      const maxChars = Math.floor((area.width || 500) / charWidthEstimate);
      // Increased max limit to match new API capability (limit is 120)
      const safeMaxChars = Math.min(maxChars, 110); 

      const text = wrapText(rawText, safeMaxChars);

      const result = await step.run(`generate-area-${area.id}`, async () => {
        try {
          const response = await fetch(`${SYNTHESIS_API_URL}/synthesize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: text,
              style: document.style,
              bias: document.bias,
              stroke_color: document.strokeColor,
              stroke_width: document.strokeWidth,
            }),
          });

          if (!response.ok) {
            return { success: false, error: await response.text() };
          }

          const data = (await response.json()) as SynthesisResponse;
          return { 
            success: true, 
            svgRaw: data.svg_raw,
            linesCount: data.lines_count 
          };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });

      if (result.success && result.svgRaw) {
        // SCALING:
        // Previous attempt with 1.5 multiplier was way too huge.
        // The synthesis output is likely in a larger coordinate space.
        // We need to scale it DOWN to fit the A4 point-based coordinates.
        // Let's try 0.5 as the baseline multiplier.
        const targetFontSize = area.fontSize || 12;
        const scale = (targetFontSize / 12) * 0.5; 

        // ESTIMATE HEIGHT:
        // Height = lines * baseLineHeight * scale
        // Base line height from synthesis is roughly 50-60 units unscaled
        const estimatedHeight = (result.linesCount || 1) * 60 * scale;

        // DYNAMIC POSITIONING (Flow Layout):
        // We want to respect the original Y if possible, but push down if overlapping.
        // Check if the original Y places this element on top of previous content.
        
        let finalY = area.y;
        
        // If the original Y overlaps with current content (plus padding), push it down.
        if (finalY < currentBottomY + verticalPadding) {
          finalY = currentBottomY + verticalPadding;
        }

        // Update the bottom cursor
        currentBottomY = finalY + estimatedHeight;

        const innerSvg = extractSvgContent(result.svgRaw);

        // Correction for left margin: The synthesis API seems to produce text with a significant
        // left margin. We subtract from X to align it closer to the template definition.
        // Based on visual inspection, it's shifted right by roughly 50-80px.
        const xCorrection = -60; 

        generatedParts.push(`
          <g transform="translate(${area.x + xCorrection}, ${finalY}) scale(${scale})">
            ${innerSvg}
          </g>
        `);
        successCount++;
      }
    }

    // Adjust final SVG height if content overflowed the page
    const finalHeight = Math.max(height, currentBottomY + 50);

    // Construct final SVG
    const finalSvg = `
      <svg width="${width}" height="${finalHeight}" viewBox="0 0 ${width} ${finalHeight}" xmlns="http://www.w3.org/2000/svg">
        ${generatedParts.join("\n")}
      </svg>
    `;

    // Save result
    await step.run("save-document", async () => {
      await db.templateDocument.update({
        where: { id: documentId },
        data: {
          status: "COMPLETED",
          previewSvg: finalSvg,
        },
      });
      
      // Also log usage
      await db.synthesisUsage.create({
        data: {
          userId,
          creditsUsed: 1, // Flat rate for template? Or per area? Let's say 1 for now.
          linesCount: 0, // Hard to calc without result metadata for all parts
          charactersCount: Object.values(content).join("").length,
          style: document.style,
          bias: document.bias,
          success: true,
        }
      });
      
      // Deduct 1 credit
       await db.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } },
      });
    });

    return { success: true, partsGenerated: successCount };
  }
);

// Export all functions for the serve handler
export const functions = [processBatchSynthesis, processBulkJob, processTemplateGeneration];
