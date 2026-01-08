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

// Combined event types
export type Events = {
  "synthesis/batch.requested": BatchSynthesisEvent;
  "synthesis/variant.completed": VariantCompletedEvent;
};
