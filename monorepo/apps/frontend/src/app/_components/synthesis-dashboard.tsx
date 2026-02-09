"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUploadThing } from "~/lib/uploadthing";
import { BatchGenerator } from "./batch-generator";

// Valid characters for synthesis
const VALID_CHARS = new Set([
  " ", "!", '"', "#", "'", "(", ")", ",", "-", ".", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  ":", ";", "?", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R",
  "S", "T", "U", "V", "W", "Y", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n",
  "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "\n"
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

interface VerificationResult {
  text: string;
  lines: Array<{
    lineNumber: number;
    text: string;
    confidence: number;
  }>;
  numLines: number;
  avgConfidence: number;
  processingTimeMs: number;
}

export function SynthesisDashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const teamParam = searchParams.get("team");
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
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [generationScope, setGenerationScope] = useState<string>(teamParam ?? "PERSONAL");

  const utils = api.useUtils();
  const { startUpload } = useUploadThing("handwritingSvg");

  const healthQuery = api.synthesis.health.useQuery(undefined, { refetchInterval: 30000 });
  const stylesQuery = api.synthesis.getStyles.useQuery();
  const statsQuery = api.synthesis.getUsageStats.useQuery(undefined, { enabled: !!session });
  const teamsQuery = api.teams.getMyTeams.useQuery(undefined, { enabled: !!session });

  const selectedTeam = useMemo(
    () => teamsQuery.data?.find((team) => team.id === generationScope),
    [teamsQuery.data, generationScope],
  );

  const availableCredits = selectedTeam ? selectedTeam.credits : (statsQuery.data?.credits ?? 0);
  const hasNoPersonalCredits = (statsQuery.data?.credits ?? 0) < 1;

  useEffect(() => {
    if (
      generationScope !== "PERSONAL" &&
      teamsQuery.data &&
      !teamsQuery.data.some((team) => team.id === generationScope)
    ) {
      setGenerationScope("PERSONAL");
    }
  }, [generationScope, teamsQuery.data]);

  const generateMutation = api.synthesis.generate.useMutation({
    onSuccess: (data, variables) => {
      setResult(data);
      setError(null);
      setSaveSuccess(false);
      setVerificationResult(null);
      void utils.credits.getBalance.invalidate();
      void utils.synthesis.getUsageStats.invalidate();
      void utils.teams.getMyTeams.invalidate();
      if (variables.teamId) {
        void utils.teams.getGenerations.invalidate({ teamId: variables.teamId });
      }
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    },
  });

  const saveGenerationMutation = api.synthesis.saveGeneration.useMutation({
    onSuccess: (_data, variables) => {
      setSaveSuccess(true);
      void utils.synthesis.getGalleryStats.invalidate();
      if (variables.teamId) {
        void utils.teams.getGenerations.invalidate({ teamId: variables.teamId });
      }
    },
    onError: (err) => {
      setError(`Failed to save: ${err.message}`);
    },
  });

  const recognizeMutation = api.synthesis.recognizeHandwriting.useMutation();

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
          error: `Line ${i + 1} has ${line.length} characters (max ${MAX_CHARS_PER_LINE})`,
        };
      }

      const invalidChars = [...line].filter((c) => !VALID_CHARS.has(c));
      if (invalidChars.length > 0) {
        return {
          valid: false,
          error: `Invalid characters: ${invalidChars.join(", ")}. Note: Q, X, Z are not supported.`,
        };
      }
    }

    return { valid: true };
  }, [text]);

  const counts = useMemo(() => {
    const lines = text.split("\n");
    const totalChars = text.length - (lines.length - 1);
    return { lines: lines.length, chars: totalChars };
  }, [text]);

  const handleGenerate = useCallback(() => {
    if (!textValidation.valid) return;
    generateMutation.mutate({
      text,
      style,
      bias,
      strokeColor,
      strokeWidth,
      teamId: selectedTeam?.id,
    });
  }, [text, style, bias, strokeColor, strokeWidth, selectedTeam, textValidation.valid, generateMutation]);

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
      const blob = new Blob([result.svgRaw], { type: "image/svg+xml" });
      const fileName = `handwriting-${Date.now()}.svg`;
      const file = new File([blob], fileName, { type: "image/svg+xml" });
      const uploadResult = await startUpload([file]);
      if (!uploadResult || uploadResult.length === 0) throw new Error("Upload failed");
      const uploadedFile = uploadResult[0]!;
      await saveGenerationMutation.mutateAsync({
        text,
        style,
        bias,
        strokeColor,
        strokeWidth,
        fileUrl: uploadedFile.ufsUrl,
        fileKey: uploadedFile.key,
        fileName: uploadedFile.name,
        svgContent: result.svgRaw,
        linesCount: result.linesCount,
        charactersCount: result.charactersCount,
        teamId: selectedTeam?.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to gallery");
    } finally {
      setIsSaving(false);
    }
  }, [result, text, style, bias, strokeColor, strokeWidth, startUpload, saveGenerationMutation, selectedTeam]);

  const handleVerifyWithOcr = useCallback(async () => {
    if (!result?.svgRaw) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const svgBlob = new Blob([result.svgRaw], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width || 800;
      canvas.height = img.height || 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const dataUrl = canvas.toDataURL("image/png");
      const base64Data = dataUrl.split(",")[1]!;

      const recognitionResult = await recognizeMutation.mutateAsync({
        imageBase64: base64Data,
        preprocess: true,
        segmentLines: true,
      });

      setVerificationResult({
        text: recognitionResult.text,
        lines: recognitionResult.lines,
        numLines: recognitionResult.numLines,
        avgConfidence: recognitionResult.avgConfidence,
        processingTimeMs: recognitionResult.processingTimeMs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  }, [result, recognizeMutation]);

  const isBackendHealthy = healthQuery.data?.status === "healthy";
  const hasNoCredits = availableCredits < 1;

  return (
    <div className="space-y-8">
      {/* Stats Cards Row */}
      {statsQuery.data && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Available Credits", value: statsQuery.data.credits, icon: "M13 10V3L4 14h7v7l9-11h-7z" },
            { label: "Total Generations", value: statsQuery.data.totalGenerations, icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
            { label: "This Month", value: statsQuery.data.thisMonthGenerations, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { label: "Total Characters", value: statsQuery.data.totalCharactersGenerated.toLocaleString(), icon: "M4 6h16M4 12h16m-7 6h7" },
          ].map((stat, idx) => (
             <div key={idx} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:bg-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-white/40">{stat.label}</span>
                  <svg className="h-4 w-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight text-white tabular-nums">
                  {stat.value}
                </div>
                {stat.label === "Available Credits" && hasNoPersonalCredits && (
                  <Link href="/credits" className="mt-2 block text-xs text-red-400 hover:text-red-300">
                    Get more credits →
                  </Link>
                )}
             </div>
          ))}
        </div>
      )}

      {/* Main Layout */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          
          {/* Editor Area */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
              <div className="flex items-center gap-2">
                 <div className="flex gap-1.5">
                   <div className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
                   <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/20" />
                   <div className="h-2.5 w-2.5 rounded-full bg-green-500/20" />
                 </div>
                 <span className="ml-2 text-xs font-medium uppercase tracking-wider text-white/30">Input</span>
              </div>
              <div className="flex items-center gap-4 text-xs tabular-nums text-white/40">
                <span className={counts.chars > MAX_CHARS_PER_LINE * MAX_LINES ? "text-red-400" : ""}>
                  {counts.chars} chars
                </span>
                <span className={counts.lines > MAX_LINES ? "text-red-400" : ""}>
                  {counts.lines}/{MAX_LINES} lines
                </span>
              </div>
            </div>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text here..."
              rows={12}
              className="w-full resize-y bg-transparent px-6 py-6 font-mono text-sm leading-relaxed text-white/80 placeholder-white/20 outline-none transition-colors focus:bg-white/[0.02]"
              spellCheck={false}
            />
            
            {!textValidation.valid && (
              <div className="border-t border-red-500/10 bg-red-500/5 px-6 py-2 text-xs text-red-400">
                {textValidation.error}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Style Selector */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">Handwriting Style</h3>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                  {stylesQuery.data?.length ?? 0} options
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {stylesQuery.data?.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`aspect-square rounded-lg border text-sm font-medium transition-all ${
                      style === s.id
                        ? "border-white/40 bg-white text-black shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                        : "border-white/5 bg-white/5 text-white/40 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {s.id}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/30">
                {stylesQuery.data?.find((s) => s.id === style)?.description ?? "Select a style"}
              </p>
            </div>

            {/* Fine Tuning */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-6 text-xs font-medium uppercase tracking-wider text-white/40">Fine Tuning</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-white/60">Neatness (Bias)</span>
                    <span className="text-white/40">{bias.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.25"
                    step="0.05"
                    value={bias}
                    onChange={(e) => setBias(parseFloat(e.target.value))}
                    className="h-1.5 w-full appearance-none rounded-full bg-white/10 accent-white outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-white/60">Stroke Width</span>
                    <span className="text-white/40">{strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="h-1.5 w-full appearance-none rounded-full bg-white/10 accent-white outline-none"
                  />
                </div>

                <div>
                  <span className="mb-3 block text-xs text-white/60">Ink Color</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setStrokeColor(color.value)}
                        className={`h-6 w-6 rounded-full border transition-all ${
                          strokeColor === color.value
                            ? "border-white ring-2 ring-white/20 scale-110"
                            : "border-transparent opacity-50 hover:opacity-100 hover:border-white/30"
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">Generation Scope</h3>
              <span className="text-xs text-white/50">{availableCredits} credits</span>
            </div>
            <select
              value={generationScope}
              onChange={(e) => setGenerationScope(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="PERSONAL" className="bg-[#0a0a0a]">
                Personal workspace
              </option>
              {teamsQuery.data?.map((team) => (
                <option key={team.id} value={team.id} className="bg-[#0a0a0a]">
                  {team.name} (team, {team.credits} credits)
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-white/40">
              {selectedTeam
                ? "This generation will be visible in the selected team for team members only."
                : "This generation is private to your personal workspace."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
             <button
               onClick={handleGenerate}
               disabled={!textValidation.valid || generateMutation.isPending || !isBackendHealthy || hasNoCredits}
               className="group relative flex-1 overflow-hidden rounded-full bg-white py-4 text-sm font-semibold text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
             >
               {generateMutation.isPending ? (
                 <span className="flex items-center justify-center gap-2">
                   <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                   Generating...
                 </span>
                ) : hasNoCredits ? (
                  selectedTeam ? "Team has no credits" : "Top up Credits"
                ) : (
                  "Generate Output"
                )}
             </button>
             
             {/* <button
                onClick={() => setShowBatchMode(true)}
                disabled={!textValidation.valid || !isBackendHealthy || hasNoCredits}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
             >
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
               Batch
             </button> */}
          </div>

          {!isBackendHealthy && !healthQuery.isLoading && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm text-red-400">
              Synthesis service is currently unavailable. Please try again later.
            </div>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="flex flex-col gap-6">
           <div className="sticky top-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/50">
             <div className="mb-6 flex items-center justify-between">
               <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">Live Preview</h2>
               {result && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveToGallery}
                      disabled={isSaving || saveSuccess}
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
                      title="Save to Gallery"
                    >
                       {saveSuccess ? (
                         <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                         </svg>
                       ) : (
                         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                         </svg>
                       )}
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white"
                      title="Download SVG"
                    >
                       <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                       </svg>
                    </button>
                    <button 
                      onClick={handleVerifyWithOcr}
                      disabled={isVerifying}
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
                      title="Verify with OCR"
                    >
                       <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                    </button>
                  </div>
               )}
             </div>

             <div className="relative aspect-[1/1.4] w-full overflow-hidden rounded-xl border border-white/5 bg-white shadow-inner">
                {result?.svgRaw ? (
                   <div 
                     className="h-full w-full overflow-auto p-4"
                     dangerouslySetInnerHTML={{ __html: result.svgRaw }} 
                   />
                ) : (
                   <div className="flex h-full flex-col items-center justify-center text-black/20">
                     <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                     <p className="mt-4 text-sm font-medium">Output Preview</p>
                   </div>
                )}
             </div>
             
             {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
                  {error}
                </div>
             )}

             {/* OCR Results */}
             {verificationResult && (
               <div className="mt-6 border-t border-white/10 pt-6">
                 <div className="mb-4 flex items-center justify-between">
                   <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">OCR Analysis</h3>
                   <span className={`text-xs font-bold ${
                     verificationResult.avgConfidence > 0.8 ? "text-emerald-400" : "text-yellow-400"
                   }`}>
                     {(verificationResult.avgConfidence * 100).toFixed(0)}% Match
                   </span>
                 </div>
                 <div className="rounded-xl bg-white/5 p-4 text-xs font-mono text-white/70">
                   {verificationResult.text || "No text detected"}
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>

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
