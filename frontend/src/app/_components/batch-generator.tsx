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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-gray-900/95 p-6 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Batch Generation
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Generate multiple variations at once (processed in background)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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

        <div className="p-6">
          {/* Text Preview */}
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">
              Text to generate
            </p>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-white">{text}</p>
          </div>

          {/* Processing Status */}
          {isProcessing && jobStatus && (
            <div className="mb-6 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    Processing Batch Job
                  </h3>
                  <p className="text-sm text-white/70">
                    {jobStatus.status === "PENDING"
                      ? "Waiting to start..."
                      : `Generating variants in background...`}
                  </p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Progress</span>
                      <span className="font-mono text-cyan-300">
                        {jobStatus.completedCount} / {jobStatus.totalVariants}
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
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
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                  Quick Presets
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(idx)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selectedPreset === idx
                          ? "border-cyan-400 bg-cyan-500/20"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <p className="font-medium text-white">{preset.name}</p>
                      <p className="mt-1 text-xs text-white/60">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Style Selection */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
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
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {STYLES.map((style) => {
                    const isSelected = variants.some((v) => v.style === style.id);
                    return (
                      <button
                        key={style.id}
                        onClick={() => toggleStyle(style.id)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                            isSelected
                              ? "bg-cyan-500 text-white"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {style.id}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {style.name}
                          </p>
                          <p className="text-xs text-white/50">{style.description}</p>
                        </div>
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-cyan-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
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
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-white/60">Variants selected</p>
                  <p className="text-2xl font-semibold text-white">
                    {variants.length}
                  </p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div>
                  <p className="text-sm text-white/60">Credits needed</p>
                  <p
                    className={`text-2xl font-semibold ${
                      hasEnoughCredits ? "text-cyan-300" : "text-red-400"
                    }`}
                  >
                    {creditsNeeded}
                  </p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div>
                  <p className="text-sm text-white/60">Your credits</p>
                  <p className="text-2xl font-semibold text-amber-300">
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
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </span>
                ) : !hasEnoughCredits ? (
                  "Not enough credits"
                ) : (
                  `Generate ${variants.length} Variants`
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                  Results ({results.filter((r) => r.success).length}/
                  {results.length} successful)
                </h3>
                <div className="flex gap-2">
                  {results.filter((r) => r.success).length > 0 && (
                    <button
                      onClick={handleSaveAll}
                      disabled={isSavingAll}
                      className="flex items-center gap-2 rounded-lg bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-500/30 disabled:opacity-50"
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
                          All Saved!
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
                          Save All to Gallery
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={clearVariants}
                    className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                  >
                    New Batch
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`overflow-hidden rounded-xl border ${
                      result.success
                        ? "border-white/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    {result.success && result.svgRaw ? (
                      <>
                        <div className="bg-white p-3">
                          <div
                            className="max-h-32 overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: result.svgRaw }}
                          />
                        </div>
                        <div className="bg-white/5 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/70">
                              Style {result.style}
                            </span>
                            <span className="text-white/50">
                              Bias: {result.bias.toFixed(2)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full border border-white/20"
                              style={{ backgroundColor: result.strokeColor }}
                            />
                            <span className="text-xs text-white/50">
                              {result.strokeWidth}px
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm font-medium text-red-300">
                          Style {result.style} failed
                        </p>
                        <p className="mt-1 text-xs text-red-400/70">
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
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">
                {batchMutation.error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
