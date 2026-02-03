"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";
import { useUploadThing } from "~/lib/uploadthing";

// Style info for display
const STYLES = [
  { id: 0, name: "Clean cursive", description: "Elegant flowing letters" },
  { id: 1, name: "Slightly slanted", description: "Natural italic style" },
  { id: 2, name: "Rounded", description: "Soft, friendly curves" },
  { id: 3, name: "Compact", description: "Space-efficient script" },
  { id: 4, name: "Wide spaced", description: "Airy, open letters" },
  { id: 5, name: "Elegant flowing", description: "Formal cursive" },
  { id: 6, name: "Quick note", description: "Casual shorthand" },
  { id: 7, name: "Neat print-like", description: "Clear and readable" },
  { id: 8, name: "Artistic flourish", description: "Decorative touches" },
  { id: 9, name: "Natural everyday", description: "Default balanced style" },
  { id: 10, name: "Bold confident", description: "Strong strokes" },
  { id: 11, name: "Light delicate", description: "Thin graceful lines" },
  { id: 12, name: "Classic formal", description: "Traditional script" },
];

const PRESET_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Dark Blue", value: "#1a365d" },
  { name: "Navy", value: "#1e3a5f" },
  { name: "Ink Blue", value: "#2c5282" },
  { name: "Dark Gray", value: "#2d3748" },
  { name: "Brown", value: "#5d4e37" },
];

// Preset batch configurations
const PRESETS = [
  {
    name: "All Styles",
    description: "Generate with all 13 handwriting styles",
    getVariants: (bias: number, color: string, width: number) =>
      STYLES.map((s) => ({ style: s.id, bias, strokeColor: color, strokeWidth: width })),
  },
  {
    name: "Bias Variations",
    description: "Same style, different neatness levels",
    getVariants: (bias: number, color: string, width: number, style: number) =>
      [0, 0.25, 0.5, 0.75, 1.0, 1.25].map((b) => ({
        style,
        bias: b,
        strokeColor: color,
        strokeWidth: width,
      })),
  },
  {
    name: "Color Variations",
    description: "Same style in different ink colors",
    getVariants: (bias: number, _color: string, width: number, style: number) =>
      PRESET_COLORS.map((c) => ({
        style,
        bias,
        strokeColor: c.value,
        strokeWidth: width,
      })),
  },
  {
    name: "Width Variations",
    description: "Same style with different stroke widths",
    getVariants: (bias: number, color: string, _width: number, style: number) =>
      [1, 2, 3, 4, 5].map((w) => ({
        style,
        bias,
        strokeColor: color,
        strokeWidth: w,
      })),
  },
];

interface BatchVariant {
  style: number;
  bias: number;
  strokeColor: string;
  strokeWidth: number;
}

interface BatchResult {
  variantIndex: number;
  style: number;
  bias: number;
  strokeColor: string;
  strokeWidth: number;
  svg?: string;
  svgRaw?: string;
  linesCount?: number;
  charactersCount?: number;
  success: boolean;
  error?: string;
}

interface BatchGeneratorProps {
  text: string;
  defaultStyle: number;
  defaultBias: number;
  defaultColor: string;
  defaultWidth: number;
  userCredits: number;
  onClose: () => void;
}

export function BatchGenerator({
  text,
  defaultStyle,
  defaultBias,
  defaultColor,
  defaultWidth,
  userCredits,
  onClose,
}: BatchGeneratorProps) {
  const [variants, setVariants] = useState<BatchVariant[]>([]);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [jobStatus, setJobStatus] = useState<{
    status: string;
    completedCount: number;
    totalVariants: number;
  } | null>(null);

  const utils = api.useUtils();
  const { startUpload } = useUploadThing("batchHandwritingSvg");

  // Start batch job mutation
  const batchMutation = api.synthesis.batchGenerate.useMutation({
    onSuccess: (data) => {
      setBatchJobId(data.batchJobId);
      setIsPolling(true);
      setJobStatus({
        status: "PENDING",
        completedCount: 0,
        totalVariants: variants.length,
      });
    },
  });

  // Poll for job status
  const statusQuery = api.synthesis.getBatchJobStatus.useQuery(
    { batchJobId: batchJobId! },
    {
      enabled: !!batchJobId && isPolling,
      refetchInterval: 2000, // Poll every 2 seconds
    }
  );

  // Handle status updates
  useEffect(() => {
    if (!statusQuery.data) return;

    const { status, completedCount, totalVariants, results: jobResults } = statusQuery.data;

    setJobStatus({ status, completedCount, totalVariants });

    // Check if job is complete
    if (status === "COMPLETED" || status === "FAILED") {
      setIsPolling(false);
      void utils.credits.getBalance.invalidate();
      void utils.synthesis.getUsageStats.invalidate();

      // Parse results from JSON
      if (jobResults && Array.isArray(jobResults)) {
        setResults(jobResults as unknown as BatchResult[]);
      }
    }
  }, [statusQuery.data, utils]);

  const saveGenerationMutation = api.synthesis.saveGeneration.useMutation();

  // Apply a preset
  const applyPreset = useCallback(
    (presetIndex: number) => {
      const preset = PRESETS[presetIndex];
      if (!preset) return;

      const newVariants = preset.getVariants(
        defaultBias,
        defaultColor,
        defaultWidth,
        defaultStyle
      );
      setVariants(newVariants);
      setSelectedPreset(presetIndex);
      setResults(null);
      setBatchJobId(null);
    },
    [defaultBias, defaultColor, defaultWidth, defaultStyle]
  );

  // Toggle a specific style
  const toggleStyle = useCallback((styleId: number) => {
    setVariants((prev) => {
      const exists = prev.find((v) => v.style === styleId);
      if (exists) {
        return prev.filter((v) => v.style !== styleId);
      } else {
        return [
          ...prev,
          {
            style: styleId,
            bias: defaultBias,
            strokeColor: defaultColor,
            strokeWidth: defaultWidth,
          },
        ];
      }
    });
    setSelectedPreset(null);
    setResults(null);
    setBatchJobId(null);
  }, [defaultBias, defaultColor, defaultWidth]);

  // Clear all variants
  const clearVariants = useCallback(() => {
    setVariants([]);
    setSelectedPreset(null);
    setResults(null);
    setBatchJobId(null);
    setJobStatus(null);
  }, []);

  // Generate batch
  const handleGenerate = useCallback(() => {
    if (variants.length === 0) return;

    batchMutation.mutate({
      text,
      variants,
      jobName: `Batch ${new Date().toLocaleString()}`,
    });
  }, [text, variants, batchMutation]);

  // Save all successful results to gallery
  const handleSaveAll = useCallback(async () => {
    if (!results) return;

    const successfulResults = results.filter((r) => r.success && r.svgRaw);
    if (successfulResults.length === 0) return;

    setIsSavingAll(true);
    setSavedCount(0);

    try {
      // Create files from SVG content
      const files = successfulResults.map((r, idx) => {
        const blob = new Blob([r.svgRaw!], { type: "image/svg+xml" });
        return new File([blob], `batch-${Date.now()}-${idx}.svg`, {
          type: "image/svg+xml",
        });
      });

      // Upload all at once
      const uploadResults = await startUpload(files);

      if (!uploadResults || uploadResults.length === 0) {
        throw new Error("Upload failed");
      }

      // Save each to database
      for (let i = 0; i < uploadResults.length; i++) {
        const upload = uploadResults[i]!;
        const result = successfulResults[i]!;

        await saveGenerationMutation.mutateAsync({
          text,
          style: result.style,
          bias: result.bias,
          strokeColor: result.strokeColor,
          strokeWidth: result.strokeWidth,
          fileUrl: upload.ufsUrl,
          fileKey: upload.key,
          fileName: upload.name,
          linesCount: result.linesCount ?? 0,
          charactersCount: result.charactersCount ?? 0,
          tags: ["batch"],
          batchJobId: batchJobId ?? undefined,
        });

        setSavedCount((c) => c + 1);
      }

      void utils.synthesis.getGalleryStats.invalidate();
    } catch (error) {
      console.error("Failed to save batch:", error);
    } finally {
      setIsSavingAll(false);
    }
  }, [results, text, startUpload, saveGenerationMutation, utils, batchJobId]);

  const creditsNeeded = variants.length;
  const hasEnoughCredits = userCredits >= creditsNeeded;
  const isProcessing = batchMutation.isPending || isPolling;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-all">
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#05070d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/5 bg-[#05070d]/80 px-8 py-6 backdrop-blur-xl">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-white">
              Batch Generation
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Generate multiple variations at once (processed in background)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full border border-white/5 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-8 pb-12">
          {/* Text Preview */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">
              Text to generate
            </p>
            <p className="mt-3 line-clamp-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/80">{text}</p>
          </div>

          {/* Processing Status */}
          {isProcessing && jobStatus && (
            <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-center gap-6">
                <div className="relative flex h-16 w-16 items-center justify-center">
                   <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium tracking-tight text-white">
                    Processing Batch Job
                  </h3>
                  <p className="text-sm text-white/60">
                    {jobStatus.status === "PENDING"
                      ? "Waiting to start..."
                      : `Generating variants in background...`}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
                      <span className="text-white/40">Progress</span>
                      <span className="font-mono text-emerald-400">
                        {jobStatus.completedCount} / {jobStatus.totalVariants}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${(jobStatus.completedCount / jobStatus.totalVariants) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Presets (hidden when processing) */}
          {!isProcessing && !results && (
            <>
              <div className="mb-8">
                <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40 pb-3">
                  Quick Presets
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(idx)}
                      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                        selectedPreset === idx
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <p className={`font-medium ${selectedPreset === idx ? "text-black" : "text-white"}`}>
                        {preset.name}
                      </p>
                      <p className={`mt-1 text-xs ${selectedPreset === idx ? "text-black/60" : "text-white/50"}`}>
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Style Selection */}
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Select Styles
                  </h3>
                  {variants.length > 0 && (
                    <button
                      onClick={clearVariants}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {STYLES.map((style) => {
                    const isSelected = variants.some((v) => v.style === style.id);
                    return (
                      <button
                        key={style.id}
                        onClick={() => toggleStyle(style.id)}
                        className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                            isSelected
                              ? "bg-emerald-500 text-black"
                              : "bg-white/5 text-white/40"
                          }`}
                        >
                          {style.id}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/80"}`}>
                            {style.name}
                          </p>
                          <p className="text-xs text-white/40">{style.description}</p>
                        </div>
                        {isSelected && (
                          <div className="rounded-full bg-emerald-500 p-1 text-black">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Credits Info & Generate Button */}
          {!results && (
            <div className="flex flex-col gap-4 sticky -bottom-8 border-t border-white/10 bg-[#05070d]/95 pt-6 pb-2 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Variants</p>
                    <p className="text-2xl font-semibold tracking-tight text-white">
                      {variants.length}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Cost</p>
                    <p
                      className={`text-2xl font-semibold tracking-tight ${
                        hasEnoughCredits ? "text-white" : "text-red-400"
                      }`}
                    >
                      {creditsNeeded} <span className="text-sm font-normal text-white/40">credits</span>
                    </p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Balance</p>
                    <p className="text-2xl font-semibold tracking-tight text-emerald-400">
                      {userCredits}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={
                    variants.length === 0 ||
                    !hasEnoughCredits ||
                    isProcessing
                  }
                  className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Processing...
                    </span>
                  ) : !hasEnoughCredits ? (
                    "Insufficient Credits"
                  ) : (
                    `Generate ${variants.length} Variants`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">
                  Results ({results.filter((r) => r.success).length} successful)
                </h3>
                <div className="flex gap-3">
                  {results.filter((r) => r.success).length > 0 && (
                    <button
                      onClick={handleSaveAll}
                      disabled={isSavingAll}
                      className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {isSavingAll ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Saving {savedCount}/{results.filter((r) => r.success).length}...
                        </>
                      ) : savedCount > 0 && savedCount === results.filter((r) => r.success).length ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Saved to Gallery
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                          </svg>
                          Save All
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={clearVariants}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Start New Batch
                  </button>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`overflow-hidden rounded-2xl border transition-all ${
                      result.success
                        ? "border-white/10 hover:border-white/20"
                        : "border-red-500/20 bg-red-500/5"
                    }`}
                  >
                    {result.success && result.svgRaw ? (
                      <>
                        <div className="bg-white p-4">
                          <div
                            className="max-h-32 overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: result.svgRaw }}
                          />
                        </div>
                        <div className="border-t border-white/5 bg-[#05070d] p-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-white">
                              Style {result.style}
                            </span>
                            <span className="text-white/40">
                              Bias {result.bias.toFixed(2)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div
                                  className="h-3 w-3 rounded-full border border-white/20 shadow-sm"
                                  style={{ backgroundColor: result.strokeColor }}
                                />
                                <span className="text-[10px] text-white/40 uppercase tracking-wide">Ink</span>
                            </div>
                            <div className="h-3 w-px bg-white/10" />
                            <span className="text-[10px] text-white/40 uppercase tracking-wide">
                              {result.strokeWidth}px Width
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full flex-col justify-center p-6 text-center">
                        <div className="mb-2 flex justify-center text-red-400">
                           <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                           </svg>
                        </div>
                        <p className="text-sm font-medium text-white">
                          Style {result.style} Failed
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {result.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {batchMutation.error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <p className="text-sm text-red-400">
                {batchMutation.error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
