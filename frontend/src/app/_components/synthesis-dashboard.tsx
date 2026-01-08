"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useUploadThing } from "~/lib/uploadthing";
import { BatchGenerator } from "./batch-generator";

// Valid characters for synthesis
const VALID_CHARS = new Set([
  " ",
  "!",
  '"',
  "#",
  "'",
  "(",
  ")",
  ",",
  "-",
  ".",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ":",
  ";",
  "?",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "Y",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "\n",
]);

const MAX_CHARS_PER_LINE = 75;
const MAX_LINES = 20;

// Preset colors
const PRESET_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Dark Blue", value: "#1a365d" },
  { name: "Navy", value: "#1e3a5f" },
  { name: "Ink Blue", value: "#2c5282" },
  { name: "Dark Gray", value: "#2d3748" },
  { name: "Brown", value: "#5d4e37" },
  { name: "Dark Red", value: "#9b2c2c" },
  { name: "Forest Green", value: "#276749" },
];

export function SynthesisDashboard() {
  const { data: session } = useSession();
  const [text, setText] = useState("Hello World!");
  const [style, setStyle] = useState(9);
  const [bias, setBias] = useState(0.75);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [result, setResult] = useState<{
    svgRaw: string;
    linesCount: number;
    charactersCount: number;
    creditsRemaining: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBatchMode, setShowBatchMode] = useState(false);

  const utils = api.useUtils();

  // UploadThing hook
  const { startUpload } = useUploadThing("handwritingSvg");

  // API queries
  const healthQuery = api.synthesis.health.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const stylesQuery = api.synthesis.getStyles.useQuery();

  const statsQuery = api.synthesis.getUsageStats.useQuery(undefined, {
    enabled: !!session,
  });

  const generateMutation = api.synthesis.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setSaveSuccess(false); // Reset save status for new generation
      void utils.credits.getBalance.invalidate();
      void utils.synthesis.getUsageStats.invalidate();
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    },
  });

  const saveGenerationMutation = api.synthesis.saveGeneration.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      void utils.synthesis.getGalleryStats.invalidate();
    },
    onError: (err) => {
      setError(`Failed to save: ${err.message}`);
    },
  });

  // Text validation
  const textValidation = useMemo(() => {
    if (!text.trim()) {
      return { valid: false, error: "Please enter some text" };
    }

    const lines = text.split("\n");
    if (lines.length > MAX_LINES) {
      return { valid: false, error: `Maximum ${MAX_LINES} lines allowed` };
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.length > MAX_CHARS_PER_LINE) {
        return {
          valid: false,
          error: `Line ${i + 1} has ${
            line.length
          } characters (max ${MAX_CHARS_PER_LINE})`,
        };
      }

      const invalidChars = [...line].filter((c) => !VALID_CHARS.has(c));
      if (invalidChars.length > 0) {
        return {
          valid: false,
          error: `Invalid characters: ${invalidChars.join(
            ", "
          )}. Note: Q, X, Z are not supported.`,
        };
      }
    }

    return { valid: true };
  }, [text]);

  // Character and line count
  const counts = useMemo(() => {
    const lines = text.split("\n");
    const totalChars = text.length - (lines.length - 1); // Subtract newline chars
    return {
      lines: lines.length,
      chars: totalChars,
    };
  }, [text]);

  const handleGenerate = useCallback(() => {
    if (!textValidation.valid) return;

    generateMutation.mutate({
      text,
      style,
      bias,
      strokeColor,
      strokeWidth,
    });
  }, [
    text,
    style,
    bias,
    strokeColor,
    strokeWidth,
    textValidation.valid,
    generateMutation,
  ]);

  const handleDownload = useCallback(() => {
    if (!result?.svgRaw) return;

    const blob = new Blob([result.svgRaw], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "handwriting.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  const handleSaveToGallery = useCallback(async () => {
    if (!result?.svgRaw) return;

    setIsSaving(true);
    setError(null);

    try {
      // Create a File from the SVG content
      const blob = new Blob([result.svgRaw], { type: "image/svg+xml" });
      const fileName = `handwriting-${Date.now()}.svg`;
      const file = new File([blob], fileName, { type: "image/svg+xml" });

      // Upload to UploadThing
      const uploadResult = await startUpload([file]);

      if (!uploadResult || uploadResult.length === 0) {
        throw new Error("Upload failed - no result returned");
      }

      const uploadedFile = uploadResult[0]!;

      // Save to database
      await saveGenerationMutation.mutateAsync({
        text,
        style,
        bias,
        strokeColor,
        strokeWidth,
        fileUrl: uploadedFile.ufsUrl,
        fileKey: uploadedFile.key,
        fileName: uploadedFile.name,
        linesCount: result.linesCount,
        charactersCount: result.charactersCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to gallery");
    } finally {
      setIsSaving(false);
    }
  }, [result, text, style, bias, strokeColor, strokeWidth, startUpload, saveGenerationMutation]);

  const isBackendHealthy = healthQuery.data?.status === "healthy";
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
              <p>Total generations</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-cyan-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
            <p className="mt-2 text-3xl font-semibold text-white">
              {statsQuery.data.totalGenerations}
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
              {statsQuery.data.thisMonthGenerations}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-white/70">
              <p>Characters generated</p>
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
              {statsQuery.data.totalCharactersGenerated.toLocaleString()}
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
          <span>Checking synthesis service status...</span>
        ) : isBackendHealthy ? (
          <span>
            Synthesis service online
            {healthQuery.data?.model_loaded
              ? " (model loaded)"
              : " (loading model...)"}
          </span>
        ) : (
          <span>
            Synthesis service unavailable -{" "}
            {(healthQuery.data as { error?: string } | undefined)?.error ??
              "Cannot connect to API"}
          </span>
        )}
      </div>

      {/* Main Synthesis Area */}
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1.15fr_0.85fr]">
        {/* Left Column - Input */}
        <div className="space-y-5">
          {/* Text Input */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                Your Text
              </h3>
              <div className="flex items-center gap-4 text-xs text-white/60">
                <span
                  className={
                    counts.chars > MAX_CHARS_PER_LINE * MAX_LINES
                      ? "text-red-400"
                      : ""
                  }
                >
                  {counts.chars} chars
                </span>
                <span
                  className={counts.lines > MAX_LINES ? "text-red-400" : ""}
                >
                  {counts.lines} / {MAX_LINES} lines
                </span>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text here... (max 20 lines, 75 chars per line)"
              rows={8}
              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
            />
            {!textValidation.valid && (
              <p className="mt-2 text-sm text-red-400">
                {textValidation.error}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Style Selector */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    Style
                  </h3>
                  <span className="rounded-full bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                    {stylesQuery.data?.length ?? 0} styles
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {stylesQuery.data?.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      title={s.description}
                      className={`rounded-lg border px-2 py-2.5 text-sm font-bold transition-all ${
                        style === s.id
                          ? "border-cyan-400 bg-linear-to-br from-cyan-500/25 to-indigo-500/25 text-white shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/30"
                          : "border-white/15 bg-black/30 text-white/60 hover:border-cyan-400/40 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {s.id}
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-black/30 px-3 py-2">
                  <p className="text-xs text-white/80">
                    {stylesQuery.data?.find((s) => s.id === style)
                      ?.description ?? "Select a handwriting style"}
                  </p>
                </div>
              </div>

              {/* Settings */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    Settings
                  </h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                    Fine tune
                  </span>
                </div>
                <div className="space-y-5">
                  {/* Bias Slider */}
                  <div>
                    <label className="mb-2 flex items-center justify-between text-sm text-white/70">
                      <span>Neatness (bias)</span>
                      <span className="font-mono text-cyan-200">
                        {bias.toFixed(2)}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1.25"
                      step="0.05"
                      value={bias}
                      onChange={(e) => setBias(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                    <div className="mt-1 flex justify-between text-xs text-white/50">
                      <span>Loose</span>
                      <span>Neat</span>
                    </div>
                  </div>

                  {/* Stroke Width */}
                  <div>
                    <label className="mb-2 flex items-center justify-between text-sm text-white/70">
                      <span>Stroke width</span>
                      <span className="font-mono text-cyan-200">
                        {strokeWidth}px
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Stroke Color */}
                  <div>
                    <label className="mb-2 block text-sm text-white/70">
                      Ink color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setStrokeColor(color.value)}
                          title={color.name}
                          className={`h-9 w-9 rounded-full border-2 transition-all ${
                            strokeColor === color.value
                              ? "border-cyan-400 ring-2 ring-cyan-400/30"
                              : "border-white/10 hover:border-white/30"
                          }`}
                          style={{ backgroundColor: color.value }}
                        />
                      ))}
                      <div className="relative">
                        <input
                          type="color"
                          value={strokeColor}
                          onChange={(e) => setStrokeColor(e.target.value)}
                          className="absolute inset-0 h-9 w-9 cursor-pointer opacity-0"
                        />
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-white/20"
                          style={{
                            background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
                          }}
                        >
                          <span className="text-xs font-semibold text-white">
                            +
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={
                !textValidation.valid ||
                generateMutation.isPending ||
                !isBackendHealthy ||
                hasNoCredits
              }
              className="flex-1 rounded-xl bg-linear-to-r from-cyan-500 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:brightness-90"
            >
              {generateMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Generating...
                </span>
              ) : hasNoCredits ? (
                "No Credits - Buy More"
              ) : (
                "Generate Handwriting (1 credit)"
              )}
            </button>
            <button
              onClick={() => setShowBatchMode(true)}
              disabled={!textValidation.valid || !isBackendHealthy || hasNoCredits}
              className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 font-semibold text-indigo-200 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              title="Generate multiple variations at once"
            >
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Batch
              </span>
            </button>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Preview</h2>
            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToGallery}
                  disabled={isSaving || saveSuccess}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    saveSuccess
                      ? "border-green-400/40 bg-green-500/20 text-green-200"
                      : "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                  } disabled:opacity-50`}
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Saving...
                    </>
                  ) : saveSuccess ? (
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
                      Saved!
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
                      Save to Gallery
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Download
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-100 shadow-lg shadow-red-500/20">
              <p className="font-semibold">Error</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              {/* SVG Preview */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-4 shadow-lg shadow-black/20">
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: result.svgRaw }}
                />
              </div>

              {/* Result Stats */}
              <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/25">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-white">
                    {result.linesCount}
                  </p>
                  <p className="text-xs text-white/60">Lines</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-white">
                    {result.charactersCount}
                  </p>
                  <p className="text-xs text-white/60">Characters</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-amber-200">
                    {result.creditsRemaining}
                  </p>
                  <p className="text-xs text-white/60">Credits left</p>
                </div>
              </div>
            </div>
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
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <p className="mt-3">
                  Enter text and generate to see the SVG preview
                </p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/25">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Tips
            </h3>
            <ul className="space-y-1 text-xs text-white/70">
              <li>
                <span className="text-cyan-200">Bias:</span> Lower values create
                more natural variation
              </li>
              <li>
                <span className="text-green-200">Styles:</span> Cycle through
                presets to find your favorite
              </li>
              <li>
                <span className="text-indigo-200">SVG:</span> Output is
                vector-based and ready for print
              </li>
              <li>
                <span className="text-amber-200">Save:</span> Save generations to your{" "}
                <Link href="/gallery" className="underline hover:text-white">
                  Gallery
                </Link>
              </li>
              <li>
                <span className="text-indigo-200">Batch:</span> Generate multiple
                styles at once with batch mode
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Batch Mode Modal */}
      {showBatchMode && (
        <BatchGenerator
          text={text}
          defaultStyle={style}
          defaultBias={bias}
          defaultColor={strokeColor}
          defaultWidth={strokeWidth}
          userCredits={statsQuery.data?.credits ?? 0}
          onClose={() => setShowBatchMode(false)}
        />
      )}
    </div>
  );
}
