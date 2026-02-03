"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DocumentViewProps {
  documentId: string;
}

const STATUS_STYLES = {
  PENDING: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pending" },
  PROCESSING: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Processing" },
  COMPLETED: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Completed" },
  FAILED: { bg: "bg-red-500/20", text: "text-red-400", label: "Failed" },
};

export function DocumentView({ documentId }: DocumentViewProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const documentQuery = api.templates.getDocument.useQuery({ id: documentId });
  
  const deleteDocumentMutation = api.templates.deleteDocument.useMutation({
    onSuccess: () => {
      utils.templates.getDocuments.invalidate();
      router.push("/templates");
    },
  });

  const retryDocumentMutation = api.templates.retryDocument.useMutation({
    onSuccess: () => {
      utils.templates.getDocument.invalidate({ id: documentId });
    },
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  const docData = documentQuery.data;
  const template = docData?.template;
  const content = docData?.content as Record<string, string> | undefined;
  const status = (docData?.status ?? "PENDING") as keyof typeof STATUS_STYLES;

  // Function to download SVG from blob
  const handleDownload = () => {
    if (!docData?.previewSvg) return;
    const blob = new Blob([docData.previewSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${docData.name}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (documentQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (documentQuery.error || !docData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
        <div className="rounded-full bg-red-500/20 p-4">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="mt-4 font-medium text-white">Document Not Found</h3>
        <p className="mt-2 text-sm text-white/50">{documentQuery.error?.message ?? "This document doesn't exist"}</p>
        <Link
          href="/templates"
          className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
        >
          Back to Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="text-white/40 hover:text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">{docData.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]?.bg ?? "bg-gray-500/20"} ${STATUS_STYLES[status]?.text ?? "text-gray-400"}`}>
                {STATUS_STYLES[status]?.label ?? status}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">
              Based on: {template?.name ?? "Unknown Template"}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {(docData.outputUrl || docData.previewSvg) && (
            <button
              onClick={docData.outputUrl ? undefined : handleDownload}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {docData.outputUrl ? (
                <a
                  href={docData.outputUrl}
                  download={`${docData.name}.svg`}
                  className="flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download SVG
                </a>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download SVG
                </>
              )}
            </button>
          )}
          
          {(status === "FAILED" || status === "PENDING" || status === "PROCESSING" || status === "COMPLETED") && (
            <button
              onClick={() => retryDocumentMutation.mutate({ id: documentId })}
              disabled={retryDocumentMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {retryDocumentMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Regenerating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {status === "FAILED" ? "Retry Generation" : status === "COMPLETED" ? "Regenerate" : "Force Restart"}
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this document?")) {
                deleteDocumentMutation.mutate({ id: documentId });
              }
            }}
            disabled={deleteDocumentMutation.isPending}
            className="rounded-lg border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Preview</h2>
          <div className="relative flex justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 group">
            {status === "COMPLETED" && docData.previewSvg && (
              <button
                onClick={() => setIsFullScreen(true)}
                className="absolute right-4 top-4 rounded-lg bg-black/50 p-2 text-white/70 opacity-0 backdrop-blur transition hover:bg-black/70 hover:text-white group-hover:opacity-100"
                title="Full Screen"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
            {status === "COMPLETED" && docData.previewSvg ? (
              <div className="relative group">
                <div
                  className="max-w-full overflow-hidden bg-white shadow-2xl"
                  dangerouslySetInnerHTML={{ __html: docData.previewSvg }}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/10 pointer-events-none">
                  <div className="pointer-events-auto">
                    {/* Centered Regenerate Button in Preview */}
                    <button
                      onClick={() => retryDocumentMutation.mutate({ id: documentId })}
                      disabled={retryDocumentMutation.isPending}
                      className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black shadow-lg transition hover:scale-105 hover:bg-gray-100"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            ) : status === "PROCESSING" ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white" />
                <p className="mt-4 text-white/50">Generating your handwritten document...</p>
                <p className="mt-2 text-xs text-white/30">This may take a minute</p>
              </div>
            ) : status === "PENDING" ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="rounded-full bg-yellow-500/20 p-4">
                  <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="mt-4 text-white/50">Document is queued for processing</p>
                <p className="mt-2 text-xs text-white/30">It will be generated shortly</p>
                <button
                  onClick={() => retryDocumentMutation.mutate({ id: documentId })}
                  disabled={retryDocumentMutation.isPending}
                  className="mt-6 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  Force Restart Generation
                </button>
              </div>
            ) : status === "FAILED" ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="rounded-full bg-red-500/20 p-4">
                  <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="mt-4 text-white/50">Generation failed</p>
                <p className="mt-2 text-xs text-white/30">Please try again or contact support</p>
                <button
                  onClick={() => retryDocumentMutation.mutate({ id: documentId })}
                  disabled={retryDocumentMutation.isPending}
                  className="mt-6 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  {retryDocumentMutation.isPending ? "Retrying..." : "Try Again"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="rounded-full bg-white/5 p-4">
                  <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-4 text-white/50">No preview available</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-white">Document Content</h2>
          
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            {content && Object.entries(content).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-white/40">{key}</label>
                <p className="text-white whitespace-pre-wrap">{value || <span className="italic text-white/30">Empty</span>}</p>
              </div>
            ))}
          </div>

          {/* Settings Used */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-medium text-white">Generation Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-white/40">Style</span>
                <p className="text-white">Style {docData.style}</p>
              </div>
              <div>
                <span className="text-xs text-white/40">Bias</span>
                <p className="text-white">{docData.bias}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Color</span>
                <div
                  className="h-5 w-5 rounded border border-white/20"
                  style={{ backgroundColor: docData.strokeColor }}
                />
                <span className="text-white">{docData.strokeColor}</span>
              </div>
              <div>
                <span className="text-xs text-white/40">Stroke Width</span>
                <p className="text-white">{docData.strokeWidth}px</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-white/40">
            <span>Created: {docData.createdAt ? new Date(docData.createdAt).toLocaleString() : "Unknown"}</span>
            <span>Updated: {docData.updatedAt ? new Date(docData.updatedAt).toLocaleString() : "Unknown"}</span>
          </div>
        </div>
      </div>
      {/* Full Screen Modal */}
      {isFullScreen && docData.previewSvg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm" onClick={() => setIsFullScreen(false)}>
          <div className="relative max-h-full max-w-full overflow-auto rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div dangerouslySetInnerHTML={{ __html: docData.previewSvg }} />
            <button
              onClick={() => setIsFullScreen(false)}
              className="absolute right-4 top-4 rounded-full bg-black/10 p-2 text-black/50 hover:bg-black/20 hover:text-black"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
