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

  // Get OCR service health
  const healthQuery = api.synthesis.ocrHealth.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Get OCR info
  const infoQuery = api.synthesis.getOcrInfo.useQuery();

  // Get user stats
  const creditsQuery = api.credits.getBalance.useQuery();

  // Recognition mutation
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

    // Extract base64 data (remove data:image/...;base64, prefix)
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
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">
          Handwriting Recognition
        </h1>
        <p className="mt-2 text-gray-400">
          Upload an image of handwritten text to convert it to digital text
        </p>
        {infoQuery.data && (
          <p className="mt-1 text-sm text-gray-500">
            Powered by {infoQuery.data.model}
          </p>
        )}
      </div>

      {/* Status Banner */}
      <div
        className={`flex items-center gap-3 rounded-xl border p-3 text-sm shadow-md ${
          isBackendHealthy
            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
            : healthQuery.isLoading
            ? "border-amber-300/40 bg-amber-500/10 text-amber-100"
            : "border-red-400/40 bg-red-500/10 text-red-100"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        {healthQuery.isLoading ? (
          <span>Checking OCR service status...</span>
        ) : isBackendHealthy ? (
          <span>
            OCR service online ({healthQuery.data?.device ?? "cpu"})
            {healthQuery.data?.models_loaded && " - Models loaded"}
          </span>
        ) : (
          <span>
            OCR service unavailable -{" "}
            {(healthQuery.data as { error?: string } | undefined)?.error ??
              "Cannot connect to API"}
          </span>
        )}
      </div>

      {/* Main OCR Area */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column - Upload */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Upload Image</h2>
          <ImageUpload
            onImageSelect={handleImageSelect}
            isLoading={recognizeMutation.isPending}
            currentImage={currentImage}
          />

          {/* Settings */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Settings
            </h3>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="checkbox"
                  checked={preprocess}
                  onChange={(e) => setPreprocess(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-sm text-white/90">
                    Preprocess image
                  </span>
                  <p className="text-xs text-white/50">
                    Auto-enhance contrast and brightness
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="checkbox"
                  checked={segmentLines}
                  onChange={(e) => setSegmentLines(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-sm text-white/90">
                    Segment lines
                  </span>
                  <p className="text-xs text-white/50">
                    Detect and process each line separately
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Recognize Button */}
          <button
            onClick={handleRecognize}
            disabled={
              !currentImage ||
              recognizeMutation.isPending ||
              !isBackendHealthy ||
              hasNoCredits
            }
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:brightness-90"
          >
            {recognizeMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Processing...
              </span>
            ) : hasNoCredits ? (
              <span>
                No Credits -{" "}
                <Link href="/credits" className="underline">
                  Buy More
                </Link>
              </span>
            ) : (
              "Recognize Handwriting (1 credit)"
            )}
          </button>

          {/* Credits Display */}
          <div className="flex items-center justify-center gap-2 text-sm text-white/60">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-amber-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
            </svg>
            <span>{creditsQuery.data?.credits ?? 0} credits remaining</span>
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Results</h2>
            {result && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy Text
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-100 shadow-lg">
              <p className="font-semibold">Error</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              {/* Recognized Text */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                  Recognized Text
                </h3>
                <div className="max-h-64 overflow-y-auto rounded-xl bg-black/40 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-white">
                    {result.text || "(No text recognized)"}
                  </pre>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/25">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-white">
                    {result.numLines}
                  </p>
                  <p className="text-xs text-white/60">Lines</p>
                </div>
                <div className="text-center">
                  <p
                    className={`text-2xl font-semibold ${getConfidenceColor(result.avgConfidence)}`}
                  >
                    {(result.avgConfidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-white/60">Confidence</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-white">
                    {result.processingTimeMs.toFixed(0)}ms
                  </p>
                  <p className="text-xs text-white/60">Processing</p>
                </div>
              </div>

              {/* Line-by-line results */}
              {result.lines.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    Line-by-Line Results
                  </h3>
                  <div className="space-y-2">
                    {result.lines.map((line) => (
                      <div
                        key={line.lineNumber}
                        className="flex items-start gap-3 rounded-lg bg-black/30 p-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/60">
                          {line.lineNumber}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-white">{line.text}</p>
                        </div>
                        <span
                          className={`text-xs ${getConfidenceColor(line.confidence)}`}
                        >
                          {(line.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Credits remaining */}
              <div className="text-center text-sm text-amber-200/80">
                Credits remaining: {result.creditsRemaining}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/5">
              <div className="text-center text-white/60">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-3">
                  Upload an image of handwritten text to see the results
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/25">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
          Tips for Best Results
        </h3>
        <ul className="grid gap-2 text-xs text-white/70 md:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="text-cyan-300">•</span>
            Use clear, high-contrast images
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-300">•</span>
            Ensure good lighting with minimal shadows
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-300">•</span>
            Keep the text horizontal and not skewed
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-300">•</span>
            Works best with English handwriting
          </li>
        </ul>
      </div>
    </div>
  );
}
