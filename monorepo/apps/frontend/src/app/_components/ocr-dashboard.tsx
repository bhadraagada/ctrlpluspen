"use client";

import { useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { ImageUpload } from "./image-upload";
import Link from "next/link";

interface LineResult {
  lineNumber: number;
  text: string;
  confidence: number;
}

interface OCRResult {
  text: string;
  lines: LineResult[];
  numLines: number;
  avgConfidence: number;
  processingTimeMs: number;
  creditsRemaining: number;
}

export function OcrDashboard() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preprocess, setPreprocess] = useState(true);
  const [segmentLines, setSegmentLines] = useState(true);

  const utils = api.useUtils();

  // Queries
  const healthQuery = api.synthesis.ocrHealth.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const infoQuery = api.synthesis.getOcrInfo.useQuery();
  const creditsQuery = api.credits.getBalance.useQuery();

  // Mutation
  const recognizeMutation = api.synthesis.recognizeHandwriting.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      void utils.credits.getBalance.invalidate();
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    },
  });

  const handleImageSelect = useCallback((imageBase64: string) => {
    setCurrentImage(imageBase64);
    setResult(null);
    setError(null);
  }, []);

  const handleRecognize = useCallback(() => {
    if (!currentImage) return;
    const base64Data = currentImage.includes(",")
      ? currentImage.split(",")[1]!
      : currentImage;
    recognizeMutation.mutate({
      imageBase64: base64Data,
      preprocess,
      segmentLines,
    });
  }, [currentImage, preprocess, segmentLines, recognizeMutation]);

  const handleCopyText = useCallback(() => {
    if (result?.text) {
      void navigator.clipboard.writeText(result.text);
    }
  }, [result]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "text-emerald-400";
    if (confidence >= 0.5) return "text-amber-400";
    return "text-red-400";
  };

  const isBackendHealthy = healthQuery.data?.status === "healthy";
  const hasNoCredits = (creditsQuery.data?.credits ?? 0) < 1;

  return (
    <div className="space-y-8">
      {/* Stats Cards Row */}
      <div className="grid gap-6 sm:grid-cols-2">
        {[
          {
            label: "Available Credits",
            value: creditsQuery.data?.credits ?? 0,
            icon: "M13 10V3L4 14h7v7l9-11h-7z",
          },
          {
            label: "Model Status",
            value: isBackendHealthy ? "Online" : "Offline",
            icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
          },
          // { label: "Model Type", value: infoQuery.data?.model ?? "Loading...", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                {stat.label}
              </span>
              <svg
                className="h-4 w-4 text-white/20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={stat.icon}
                />
              </svg>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className={`text-5xl font-semibold tracking-tight tabular-nums  ${stat.label === "Model Status" ? (isBackendHealthy ? "text-emerald-400" : "text-red-400") : "text-white"}`}
              >
                {stat.value}
              </span>
            </div>
            {stat.label === "Available Credits" && hasNoCredits && (
              <Link
                href="/credits"
                className="mt-2 block text-xs text-red-400 hover:text-red-300"
              >
                Top up needed →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left Column: Upload & Settings */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="mb-6 text-xs font-medium uppercase tracking-wider text-white/40">
              Source Image
            </h3>
            <ImageUpload
              onImageSelect={handleImageSelect}
              isLoading={recognizeMutation.isPending}
              currentImage={currentImage}
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">
              Processing Options
            </h3>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:bg-white/[0.05]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">
                    Preprocessing
                  </span>
                  <span className="text-xs text-white/40">
                    Enhance contrast & brightness
                  </span>
                </div>
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors ${preprocess ? "bg-emerald-500" : "bg-white/10"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={preprocess}
                    onChange={(e) => setPreprocess(e.target.checked)}
                  />
                  <span
                    className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${preprocess ? "translate-x-5" : ""}`}
                  />
                </div>
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:bg-white/[0.05]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">
                    Line Segmentation
                  </span>
                  <span className="text-xs text-white/40">
                    Process each line individually
                  </span>
                </div>
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors ${segmentLines ? "bg-emerald-500" : "bg-white/10"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={segmentLines}
                    onChange={(e) => setSegmentLines(e.target.checked)}
                  />
                  <span
                    className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${segmentLines ? "translate-x-5" : ""}`}
                  />
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleRecognize}
            disabled={
              !currentImage ||
              recognizeMutation.isPending ||
              !isBackendHealthy ||
              hasNoCredits
            }
            className="group w-full overflow-hidden rounded-full bg-white py-4 text-sm font-semibold text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
          >
            {recognizeMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Analyzing...
              </span>
            ) : hasNoCredits ? (
              "No Credits"
            ) : (
              "Start Recognition"
            )}
          </button>

          {!isBackendHealthy && !healthQuery.isLoading && (
            <p className="text-center text-xs text-red-400">
              Service unavailable. Please try again later.
            </p>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
              Output
            </h2>
            {result && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-white hover:text-black"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                Copy
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {result ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Text Output */}
              <div className="relative min-h-[200px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-500 to-indigo-500" />
                <div className="p-8">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/90">
                    {result.text || (
                      <span className="text-white/30 italic">
                        No text detected.
                      </span>
                    )}
                  </pre>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs text-white/40">Lines</div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {result.numLines}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs text-white/40">Confidence</div>
                  <div
                    className={`mt-1 text-xl font-semibold ${getConfidenceColor(result.avgConfidence)}`}
                  >
                    {(result.avgConfidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs text-white/40">Time</div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {result.processingTimeMs.toFixed(0)}ms
                  </div>
                </div>
              </div>

              {/* Line Breakdown */}
              {result.lines.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">
                    Line Analysis
                  </h3>
                  <div className="space-y-2">
                    {result.lines.map((line) => (
                      <div
                        key={line.lineNumber}
                        className="group flex items-center justify-between rounded-lg p-2 transition hover:bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px] text-white/50 font-mono">
                            {line.lineNumber}
                          </span>
                          <span className="text-sm text-white/80">
                            {line.text}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-medium ${getConfidenceColor(line.confidence)}`}
                        >
                          {(line.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center text-white/30">
              <svg
                className="h-12 w-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium">
                No results generated yet
              </p>
              <p className="mt-1 text-xs">
                Upload an image and click start to see recognition data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
