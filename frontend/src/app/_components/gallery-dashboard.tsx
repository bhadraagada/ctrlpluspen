"use client";

import { useState, useCallback } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

// Style names for display
const STYLE_NAMES = [
  "Clean cursive",
  "Slightly slanted",
  "Rounded",
  "Compact",
  "Wide spaced",
  "Elegant flowing",
  "Quick note",
  "Neat print-like",
  "Artistic flourish",
  "Natural everyday",
  "Bold confident",
  "Light delicate",
  "Classic formal",
];

// Status colors and labels
const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; animate?: boolean }> = {
  PENDING: { label: "Pending", color: "bg-yellow-500", textColor: "text-yellow-300" },
  GENERATING: { label: "Generating...", color: "bg-cyan-500", textColor: "text-cyan-300", animate: true },
  COMPLETED: { label: "Completed", color: "bg-green-500", textColor: "text-green-300" },
  FAILED: { label: "Failed", color: "bg-red-500", textColor: "text-red-300" },
};

export function GalleryDashboard() {
  const [filter, setFilter] = useState<{
    favoritesOnly: boolean;
    tag?: string;
    style?: number;
    search: string;
    sortBy: "newest" | "oldest" | "style";
  }>({
    favoritesOnly: false,
    search: "",
    sortBy: "newest",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const utils = api.useUtils();

  // Queries - refetch frequently to catch status updates
  const galleryQuery = api.synthesis.getGallery.useInfiniteQuery(
    {
      limit: 20,
      favoritesOnly: filter.favoritesOnly,
      tag: filter.tag,
      style: filter.style,
      search: filter.search || undefined,
      sortBy: filter.sortBy,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: 3000, // Refetch every 3 seconds to catch batch updates
    }
  );

  const statsQuery = api.synthesis.getGalleryStats.useQuery();
  const tagsQuery = api.synthesis.getAllTags.useQuery();

  // Mutations
  const toggleFavoriteMutation = api.synthesis.toggleFavorite.useMutation({
    onSuccess: () => {
      void utils.synthesis.getGallery.invalidate();
      void utils.synthesis.getGalleryStats.invalidate();
    },
  });

  const deleteMutation = api.synthesis.deleteGeneration.useMutation({
    onSuccess: () => {
      void utils.synthesis.getGallery.invalidate();
      void utils.synthesis.getGalleryStats.invalidate();
      setSelectedId(null);
    },
  });

  const handleToggleFavorite = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFavoriteMutation.mutate({ id });
    },
    [toggleFavoriteMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this generation?")) {
        deleteMutation.mutate({ id });
      }
    },
    [deleteMutation]
  );

  // Flatten paginated data
  const allItems = galleryQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedItem = allItems.find((item) => item.id === selectedId);

  // Check if any items are still processing (for showing refresh indicator)
  const hasProcessingItems = allItems.some(
    (item) => item.status === "PENDING" || item.status === "GENERATING"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Generator
            </Link>
            <h1 className="text-3xl font-bold text-white">Gallery</h1>
            {statsQuery.data && (
              <p className="mt-1 text-sm text-white/60">
                {statsQuery.data.total} generations ({statsQuery.data.favorites}{" "}
                favorites)
                {hasProcessingItems && (
                  <span className="ml-2 inline-flex items-center gap-1 text-cyan-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                    Processing...
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by text..."
              value={filter.search}
              onChange={(e) =>
                setFilter((f) => ({ ...f, search: e.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Favorites Toggle */}
          <button
            onClick={() =>
              setFilter((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
            }
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition ${
              filter.favoritesOnly
                ? "bg-amber-500 text-white"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
            Favorites
          </button>

          {/* Style Filter */}
          <select
            value={filter.style ?? ""}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                style: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="">All Styles</option>
            {STYLE_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>
                Style {idx}: {name}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          {tagsQuery.data && tagsQuery.data.length > 0 && (
            <select
              value={filter.tag ?? ""}
              onChange={(e) =>
                setFilter((f) => ({
                  ...f,
                  tag: e.target.value || undefined,
                }))
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="">All Tags</option>
              {tagsQuery.data.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={filter.sortBy}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                sortBy: e.target.value as "newest" | "oldest" | "style",
              }))
            }
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="style">By Style</option>
          </select>
        </div>

        {/* Gallery Grid */}
        {galleryQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-16 w-16 text-white/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No generations yet
            </h2>
            <p className="mt-2 text-white/60">
              Generate some handwriting and save it to your gallery!
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-3 font-semibold text-white"
            >
              Start Generating
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allItems.map((item) => {
                const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.COMPLETED;
                const isProcessing = item.status === "PENDING" || item.status === "GENERATING";
                const isFailed = item.status === "FAILED";
                const isCompleted = item.status === "COMPLETED";

                return (
                  <div
                    key={item.id}
                    onClick={() => isCompleted && setSelectedId(item.id)}
                    className={`group relative overflow-hidden rounded-2xl border bg-white/5 shadow-lg transition ${
                      isCompleted ? "cursor-pointer hover:shadow-xl" : "cursor-default"
                    } ${
                      selectedId === item.id
                        ? "border-cyan-400 ring-2 ring-cyan-400/30"
                        : isProcessing
                          ? "border-cyan-400/50"
                          : isFailed
                            ? "border-red-500/50"
                            : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Status Badge */}
                    {item.status !== "COMPLETED" && (
                      <div className={`absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.color} text-white`}>
                        {statusConfig.animate && (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        )}
                        {statusConfig.label}
                      </div>
                    )}

                    {/* SVG Preview */}
                    <div className="aspect-video overflow-hidden bg-white p-4">
                      {isProcessing ? (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
                            <p className="mt-3 text-sm text-gray-500">
                              {item.status === "PENDING" ? "Waiting..." : "Generating..."}
                            </p>
                          </div>
                        </div>
                      ) : isFailed ? (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="mt-2 text-sm">Generation failed</p>
                          </div>
                        </div>
                      ) : item.svgContent ? (
                        <div
                          className="h-full w-full"
                          dangerouslySetInnerHTML={{ __html: item.svgContent }}
                        />
                      ) : item.fileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.fileUrl}
                          alt={item.text.slice(0, 50)}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          No preview
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <p className="line-clamp-2 text-sm text-white/80">
                        {item.text}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                        <span>Style {item.style}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      {item.errorMessage && (
                        <p className="mt-2 line-clamp-2 text-xs text-red-400">
                          {item.errorMessage}
                        </p>
                      )}
                      {item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Favorite Button - only for completed */}
                    {isCompleted && (
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className={`absolute right-3 top-3 rounded-full p-2 transition ${
                          item.isFavorite
                            ? "bg-amber-500 text-white"
                            : "bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/70"
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
                            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {galleryQuery.hasNextPage && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => galleryQuery.fetchNextPage()}
                  disabled={galleryQuery.isFetchingNextPage}
                  className="rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {galleryQuery.isFetchingNextPage
                    ? "Loading..."
                    : "Load More"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        {selectedItem && selectedItem.status === "COMPLETED" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSelectedId(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview */}
              <div className="bg-white p-6">
                {selectedItem.svgContent ? (
                  <div
                    className="w-full"
                    dangerouslySetInnerHTML={{ __html: selectedItem.svgContent }}
                  />
                ) : selectedItem.fileUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedItem.fileUrl}
                    alt={selectedItem.text}
                    className="w-full object-contain"
                  />
                ) : null}
              </div>

              {/* Details */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white">{selectedItem.text}</p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/50">Style:</span>{" "}
                        <span className="text-white">
                          {selectedItem.style} - {STYLE_NAMES[selectedItem.style]}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50">Bias:</span>{" "}
                        <span className="text-white">
                          {selectedItem.bias.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50">Stroke:</span>{" "}
                        <span className="text-white">
                          {selectedItem.strokeColor} ({selectedItem.strokeWidth}
                          px)
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50">Created:</span>{" "}
                        <span className="text-white">
                          {new Date(selectedItem.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {selectedItem.fileUrl && (
                    <a
                      href={selectedItem.fileUrl}
                      download={`handwriting-${selectedItem.id}.svg`}
                      className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-white hover:bg-cyan-600"
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
                    </a>
                  )}
                  {selectedItem.svgContent && !selectedItem.fileUrl && (
                    <button
                      onClick={() => {
                        const blob = new Blob([selectedItem.svgContent!], { type: "image/svg+xml" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `handwriting-${selectedItem.id}.svg`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-white hover:bg-cyan-600"
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
                      Download SVG
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleFavorite(selectedItem.id, {} as React.MouseEvent)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold ${
                      selectedItem.isFavorite
                        ? "bg-amber-500 text-white"
                        : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {selectedItem.isFavorite ? "Unfavorite" : "Favorite"}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Delete
                  </button>
                </div>

                {/* Tags */}
                {selectedItem.tags.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-2 text-sm text-white/50">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedId(null)}
                className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
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
          </div>
        )}
      </div>
    </div>
  );
}
