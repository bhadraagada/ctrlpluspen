"use client";

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

  const document = documentQuery.data;
  const template = document?.template;
  const content = document?.content as Record<string, string> | undefined;
  const status = document?.status as keyof typeof STATUS_STYLES;

  if (documentQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (documentQuery.error || !document) {
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
              <h1 className="text-2xl font-semibold text-white">{document.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]?.bg} ${STATUS_STYLES[status]?.text}`}>
                {STATUS_STYLES[status]?.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">
              Based on: {template?.name ?? "Unknown Template"}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {document.outputUrl && (
            <a
              href={document.outputUrl}
              download={`${document.name}.svg`}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download SVG
            </a>
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
          <div className="flex justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            {status === "COMPLETED" && document.previewSvg ? (
              <div
                className="max-w-full overflow-auto bg-white p-4 shadow-2xl"
                dangerouslySetInnerHTML={{ __html: document.previewSvg }}
              />
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
                <p className="text-white">Style {document.style}</p>
              </div>
              <div>
                <span className="text-xs text-white/40">Bias</span>
                <p className="text-white">{document.bias}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Color</span>
                <div
                  className="h-5 w-5 rounded border border-white/20"
                  style={{ backgroundColor: document.strokeColor }}
                />
                <span className="text-white">{document.strokeColor}</span>
              </div>
              <div>
                <span className="text-xs text-white/40">Stroke Width</span>
                <p className="text-white">{document.strokeWidth}px</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-white/40">
            <span>Created: {new Date(document.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(document.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
