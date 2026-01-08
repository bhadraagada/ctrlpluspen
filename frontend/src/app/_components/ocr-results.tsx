"use client";

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
}

interface TextRegion {
  text: string;
  confidence: number;
  bounding_box: BoundingBox;
}

interface OcrResultsProps {
  text: string;
  regions: TextRegion[];
  numRegions: number;
  avgConfidence: number;
  inferenceTimeMs: number;
  creditsRemaining?: number;
}

export function OcrResults({
  text,
  regions,
  numRegions,
  avgConfidence,
  inferenceTimeMs,
  creditsRemaining,
}: OcrResultsProps) {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center shadow-md shadow-black/20">
          <p className="text-2xl font-semibold text-cyan-200">{numRegions}</p>
          <p className="text-xs text-white/60">Text regions</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center shadow-md shadow-black/20">
          <p className="text-2xl font-semibold text-emerald-200">
            {(avgConfidence * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-white/60">Confidence</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center shadow-md shadow-black/20">
          <p className="text-2xl font-semibold text-indigo-200">
            {inferenceTimeMs.toFixed(0)}ms
          </p>
          <p className="text-xs text-white/60">Processing</p>
        </div>
        {creditsRemaining !== undefined && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center shadow-md shadow-black/20">
            <p className="text-2xl font-semibold text-amber-200">
              {creditsRemaining}
            </p>
            <p className="text-xs text-white/60">Credits left</p>
          </div>
        )}
      </div>

      {/* Recognized Text */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recognized text</h3>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-white/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy
          </button>
        </div>
        <div className="max-h-75 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-4">
          {text ? (
            <p className="whitespace-pre-wrap font-mono text-white/90">
              {text}
            </p>
          ) : (
            <p className="italic text-white/50">No text detected</p>
          )}
        </div>
      </div>

      {/* Detailed Regions */}
      {regions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Detected regions ({regions.length})
          </h3>
          <div className="max-h-75 space-y-3 overflow-y-auto">
            {regions.map((region, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/5 bg-black/40 p-3 transition-colors hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-mono text-white/90">{region.text}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        region.confidence >= 0.8
                          ? "bg-emerald-500/20 text-emerald-200"
                          : region.confidence >= 0.5
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-red-500/20 text-red-200"
                      }`}
                    >
                      {(region.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
