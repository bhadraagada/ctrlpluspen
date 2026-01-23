"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, string> = {
  LETTER: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  NOTE: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  JOURNAL: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  INVITATION: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
  CERTIFICATE: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  CUSTOM: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
};

const CATEGORY_COLORS: Record<string, string> = {
  LETTER: "from-blue-500/20 to-indigo-500/20",
  NOTE: "from-yellow-500/20 to-orange-500/20",
  JOURNAL: "from-purple-500/20 to-pink-500/20",
  INVITATION: "from-rose-500/20 to-red-500/20",
  CERTIFICATE: "from-amber-500/20 to-yellow-500/20",
  CUSTOM: "from-gray-500/20 to-slate-500/20",
};

export function TemplatesDashboard() {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [view, setView] = useState<"templates" | "documents">("templates");

  const templatesQuery = api.templates.getAll.useQuery(
    activeCategory ? { category: activeCategory as any } : {}
  );
  const documentsQuery = api.templates.getDocuments.useQuery({ limit: 20 });

  const categories = ["LETTER", "NOTE", "JOURNAL", "INVITATION", "CERTIFICATE", "CUSTOM"];

  return (
    <div className="space-y-8">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          <button
            onClick={() => setView("templates")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              view === "templates" ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setView("documents")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              view === "documents" ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            My Documents
          </button>
        </div>

        {view === "templates" && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory(undefined)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition ${
                !activeCategory
                  ? "bg-white text-black"
                  : "border border-white/10 text-white/60 hover:text-white"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
                  activeCategory === cat
                    ? "bg-white text-black"
                    : "border border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {cat.toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "templates" ? (
        <>
          {templatesQuery.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templatesQuery.data?.map((template) => (
                <Link
                  key={template.id}
                  href={`/templates/${template.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]"
                >
                  {/* Preview Area */}
                  <div className={`relative h-40 bg-gradient-to-br ${CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.CUSTOM}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="h-16 w-16 text-white/20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d={CATEGORY_ICONS[template.category] ?? CATEGORY_ICONS.CUSTOM}
                        />
                      </svg>
                    </div>
                    {template.isSystem && (
                      <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur">
                        System
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-medium text-white group-hover:text-white/90">
                      {template.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-white/50">
                      {template.description ?? "No description"}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4 text-xs text-white/30">
                      <span className="capitalize">{template.category.toLowerCase()}</span>
                      <span>{template.usageCount} uses</span>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Create Custom Template */}
              <button className="group flex h-full min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] transition hover:border-white/20 hover:bg-white/[0.03]">
                <div className="rounded-full bg-white/5 p-4 transition group-hover:bg-white/10">
                  <svg className="h-8 w-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="mt-4 text-sm font-medium text-white/50">Create Custom Template</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {documentsQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          ) : documentsQuery.data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
              <div className="rounded-full bg-white/5 p-4">
                <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 font-medium text-white">No Documents Yet</h3>
              <p className="mt-2 text-sm text-white/50">Start by selecting a template</p>
              <button
                onClick={() => setView("templates")}
                className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
              >
                Browse Templates
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {documentsQuery.data?.items.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/templates/documents/${doc.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="relative h-32 bg-white/5">
                    {doc.previewSvg ? (
                      <div className="h-full w-full p-4" dangerouslySetInnerHTML={{ __html: doc.previewSvg }} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/20">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      doc.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" :
                      doc.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {doc.status.toLowerCase()}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-medium text-white">{doc.name}</h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-white/40">
                      <span>{doc.template?.name ?? "Unknown Template"}</span>
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
