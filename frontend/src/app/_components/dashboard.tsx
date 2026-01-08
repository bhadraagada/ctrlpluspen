"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { ImageUpload } from "./image-upload";
import { OcrResults } from "./ocr-results";
import Link from "next/link";

interface OcrResult {
  text: string;
  regions: Array<{
    text: string;
    confidence: number;
    bounding_box: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      confidence: number;
    };
  }>;
  num_regions: number;
  avg_confidence: number;
  total_inference_time_ms: number;
  creditsRemaining: number;
}

export function Dashboard() {
  const { data: session } = useSession();
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [preprocess, setPreprocess] = useState(true);

  const utils = api.useUtils();

  const healthQuery = api.ocr.health.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const statsQuery = api.ocr.getUsageStats.useQuery(undefined, {
    enabled: !!session,
  });

  const recognizeMutation = api.ocr.recognize.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      // Invalidate credits query to update navbar
      void utils.credits.getBalance.invalidate();
      void utils.ocr.getUsageStats.invalidate();
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    },
  });

  const handleImageSelect = (imageBase64: string) => {
    setCurrentImage(imageBase64);
    setResult(null);
    setError(null);
  };

  const handleRecognize = () => {
    if (!currentImage) return;

    recognizeMutation.mutate({
      imageBase64: currentImage,
      confidenceThreshold,
      preprocess,
    });
  };

  const isBackendHealthy =
    healthQuery.data?.status === "healthy" && healthQuery.data?.models_loaded;

  const hasNoCredits = (statsQuery.data?.credits ?? 0) < 1;

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      {statsQuery.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-white/70">
              <p>Credits balance</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-amber-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
              </svg>
            </div>
            <p className="mt-2 text-3xl font-semibold text-white">
              {statsQuery.data.credits}
            </p>
            {hasNoCredits && (
              <Link
                href="/credits"
                className="mt-2 inline-block text-sm font-medium text-cyan-200 hover:text-white"
              >
                Get more credits
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-white/70">
              <p>Total scans</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-cyan-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            <p className="mt-2 text-3xl font-semibold text-white">
              {statsQuery.data.totalScans}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-white/70">
              <p>This month</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mt-2 text-3xl font-semibold text-white">
              {statsQuery.data.thisMonthScans}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-white/70">
              <p>Characters recognized</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-indigo-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mt-2 text-3xl font-semibold text-white">
              {statsQuery.data.totalCharactersRecognized.toLocaleString()}
            </p>
          </div>
        </div>
      )}

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
            OCR service online ({healthQuery.data?.device ?? "unknown"})
          </span>
        ) : (
          <span>
            OCR service unavailable -{" "}
            {(healthQuery.data as { error?: string } | undefined)?.error ??
              "Cannot connect to OCR API"}
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
            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center justify-between text-sm text-white/70">
                  <span>Confidence threshold</span>
                  <span className="font-mono text-cyan-200">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) =>
                    setConfidenceThreshold(parseFloat(e.target.value))
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="checkbox"
                  checked={preprocess}
                  onChange={(e) => setPreprocess(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-white/70">
                  Preprocess image (recommended)
                </span>
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
            className="w-full rounded-xl bg-linear-to-r from-cyan-500 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:brightness-90"
          >
            {recognizeMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Processing...
              </span>
            ) : hasNoCredits ? (
              "No Credits - Buy More"
            ) : (
              "Recognize Handwriting (1 credit)"
            )}
          </button>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Results</h2>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-4 text-red-400">
              <p className="font-medium">Error</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {result ? (
            <OcrResults
              text={result.text}
              regions={result.regions}
              numRegions={result.num_regions}
              avgConfidence={result.avg_confidence}
              inferenceTimeMs={result.total_inference_time_ms}
              creditsRemaining={result.creditsRemaining}
            />
          ) : (
            <div className="flex min-h-100 items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/5">
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
                  Upload an image and run OCR to see the output
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
