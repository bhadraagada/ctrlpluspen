import { Inngest } from "inngest";

// Create Inngest client for handwriting synthesis app
export const inngest = new Inngest({
  id: "handwriting-studio",
  // Event schemas for type safety
});

// Event types for batch synthesis
export interface BatchSynthesisEvent {
  name: "synthesis/batch.requested";
  data: {
    batchJobId: string;
    userId: string;
    text: string;
    variants: Array<{
      style: number;
      bias: number;
      strokeColor: string;
      strokeWidth: number;
    }>;
    generationIds: string[]; // IDs of pre-created SavedGeneration records
  };
}

// Event for single variant completion (used for progress updates)
export interface VariantCompletedEvent {
  name: "synthesis/variant.completed";
  data: {
    batchJobId: string;
    variantIndex: number;
    success: boolean;
    svg?: string;
    svgRaw?: string;
    linesCount?: number;
    charactersCount?: number;
    error?: string;
  };
}

// Event for bulk job creation
export interface BulkJobCreatedEvent {
  name: "bulk/job.created";
  data: {
    jobId: string;
    userId: string;
  };
}

// Event for template document generation
export interface TemplateGeneratedEvent {
  name: "templates/document.generated";
  data: {
    documentId: string;
    userId: string;
  };
}

// Combined event types
export type Events = {
  "synthesis/batch.requested": BatchSynthesisEvent;
  "synthesis/variant.completed": VariantCompletedEvent;
  "bulk/job.created": BulkJobCreatedEvent;
  "templates/document.generated": TemplateGeneratedEvent;
};
