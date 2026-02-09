"use client";

import { useState, useCallback } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

// Style names for display
const STYLE_NAMES = [
  "Clean cursive", "Slightly slanted", "Rounded", "Compact", "Wide spaced",
  "Elegant flowing", "Quick note", "Neat print-like", "Artistic flourish",
  "Natural everyday", "Bold confident", "Light delicate", "Classic formal",
];

// Status colors and labels
const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; animate?: boolean }> = {
  PENDING: { label: "Pending", color: "bg-yellow-500", textColor: "text-yellow-300" },
  GENERATING: { label: "Generating...", color: "bg-cyan-500", textColor: "text-cyan-300", animate: true },
  COMPLETED: { label: "Completed", color: "bg-emerald-500", textColor: "text-emerald-300" },
  FAILED: { label: "Failed", color: "bg-red-500", textColor: "text-red-300" },
};

// Extended type
type GalleryItem = {
  id: string;
  text: string;
  style: number;
  bias: number;
  strokeColor: string;
  strokeWidth: number;
  fileUrl: string | null;
  fileKey: string | null;
  svgContent: string | null;
  status: string;
  isFavorite: boolean;
  tags: string[];
  createdAt: Date;
  errorMessage: string | null;
  realisticPng?: string | null;
  realisticUrl?: string | null;
  paperType?: string | null;
  inkType?: string | null;
  wearLevel?: number | null;
};

// Paper and ink type options
const PAPER_TYPES = [
  { id: "white", name: "White", icon: "bg-white" },
  { id: "cream", name: "Cream", icon: "bg-amber-50" },
  { id: "aged", name: "Aged", icon: "bg-amber-100" },
  { id: "lined", name: "Lined", icon: "bg-blue-50" },
  { id: "grid", name: "Grid", icon: "bg-blue-50" },
  { id: "recycled", name: "Recycled", icon: "bg-gray-200" },
];

const INK_TYPES = [
  { id: "ballpoint", name: "Ballpoint" },
  { id: "gel", name: "Gel Pen" },
  { id: "fountain", name: "Fountain" },
  { id: "marker", name: "Marker" },
  { id: "pencil", name: "Pencil" },
];

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
  
  // Realistic rendering state
  const [viewMode, setViewMode] = useState<"svg" | "realistic">("svg");
  const [showRealisticSettings, setShowRealisticSettings] = useState(false);
  const [realisticSettings, setRealisticSettings] = useState({
    paperType: "white",
    inkType: "ballpoint",
    wearLevel: 0.3,
  });

  const utils = api.useUtils();

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
      refetchInterval: 3000,
    }
  );

  const statsQuery = api.synthesis.getGalleryStats.useQuery();
  const tagsQuery = api.synthesis.getAllTags.useQuery();

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

  const makeRealisticMutation = api.synthesis.makeRealistic.useMutation({
    onSuccess: () => {
      void utils.synthesis.getGallery.invalidate();
      setShowRealisticSettings(false);
      setViewMode("realistic");
    },
  });

  const clearRealisticMutation = api.synthesis.clearRealistic.useMutation({
    onSuccess: () => {
      void utils.synthesis.getGallery.invalidate();
      setViewMode("svg");
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

  const handleMakeRealistic = useCallback(() => {
    if (!selectedId) return;
    makeRealisticMutation.mutate({
      generationId: selectedId,
      paperType: realisticSettings.paperType,
      inkType: realisticSettings.inkType,
      wearLevel: realisticSettings.wearLevel,
    });
  }, [selectedId, realisticSettings, makeRealisticMutation]);

  const handleClearRealistic = useCallback(() => {
    if (!selectedId) return;
    clearRealisticMutation.mutate({ generationId: selectedId });
  }, [selectedId, clearRealisticMutation]);

  const allItems = (galleryQuery.data?.pages.flatMap((page) => page.items) ?? []) as GalleryItem[];
  const selectedItem = allItems.find((item) => item.id === selectedId);
  const hasProcessingItems = allItems.some((item) => item.status === "PENDING" || item.status === "GENERATING");

  return (
    <div className="space-y-8">
      {/* Stats & Controls Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        
        {/* Search and Filters */}
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative min-w-[280px]">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
               <svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
             </div>
             <input
               type="text"
               placeholder="Search generations..."
               value={filter.search}
               onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
               className="w-full rounded-full border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 transition focus:border-white/20 focus:bg-white/[0.05] focus:outline-none"
             />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setFilter((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                filter.favoritesOnly
                  ? "bg-white text-black font-medium"
                  : "border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Favorites
            </button>

            <select
              value={filter.sortBy}
              onChange={(e) => setFilter((f) => ({ ...f, sortBy: e.target.value as any }))}
              className="appearance-none rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 pr-8 text-sm text-white/60 hover:bg-white/[0.08] hover:text-white focus:outline-none"
              style={{ backgroundImage: 'none' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="style">By Style</option>
            </select>

            {/* Hidden native arrow replacement if desired, or keep simple */}
          </div>
        </div>

        {/* Stats */}
        {statsQuery.data && (
           <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-white/40">
             <span>{statsQuery.data.total} Items</span>
             <span className="h-1 w-1 rounded-full bg-white/20" />
             <span>{statsQuery.data.favorites} Saved</span>
             {hasProcessingItems && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                    Syncing
                  </span>
                </>
             )}
           </div>
        )}
      </div>

      {/* Grid */}
      {galleryQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] py-24 text-center">
          <div className="rounded-full bg-white/5 p-4">
            <svg className="h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mt-4 font-medium text-white">Empty Gallery</h3>
          <p className="mt-2 text-sm text-white/40">Your saved generations will appear here.</p>
          <Link
            href="/synthesis"
            className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
          >
            Create New
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allItems.map((item) => {
              const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.COMPLETED!;
              const isProcessing = item.status === "PENDING" || item.status === "GENERATING";
              const isCompleted = item.status === "COMPLETED";
              const hasRealistic = !!item.realisticPng;

              return (
                <div
                  key={item.id}
                  onClick={() => isCompleted && setSelectedId(item.id)}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white/[0.02] transition-all duration-300 hover:bg-white/[0.04] ${
                    selectedId === item.id
                      ? "border-white/40 shadow-[0_0_30px_-10px_rgba(255,255,255,0.1)]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Status Indicator */}
                  {item.status !== "COMPLETED" && (
                    <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-medium text-white backdrop-blur">
                      {statusConfig.animate && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                      )}
                      {statusConfig.label}
                    </div>
                  )}
                  
                  {/* Realistic Badge */}
                  {isCompleted && hasRealistic && (
                     <div className="absolute left-3 top-3 z-10 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500 backdrop-blur">
                       Realistic
                     </div>
                  )}

                  {/* Preview Image */}
                  <div className="relative aspect-[1.4/1] w-full overflow-hidden bg-white p-4 transition-opacity group-hover:opacity-90">
                    {isProcessing ? (
                       <div className="flex h-full items-center justify-center">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
                       </div>
                    ) : item.svgContent ? (
                       <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: item.svgContent }} />
                    ) : item.fileUrl ? (
                       // eslint-disable-next-line @next/next/no-img-element
                       <img src={item.fileUrl} alt="Preview" className="h-full w-full object-contain" />
                    ) : (
                       <div className="flex h-full items-center justify-center bg-gray-50 text-xs text-gray-400">No Preview</div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 text-sm font-medium leading-relaxed text-white/90">
                      {item.text || "Untitled"}
                    </p>
                    <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-white/40">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>Style {item.style}</span>
                    </div>
                  </div>

                  {/* Quick Action Overlay (Hover) */}
                  {isCompleted && (
                     <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleToggleFavorite(item.id, e)}
                          className={`rounded-full border border-white/10 bg-black/50 p-2 text-white backdrop-blur hover:bg-white hover:text-black ${
                            item.isFavorite ? "text-amber-400 hover:text-amber-500" : ""
                          }`}
                        >
                          <svg className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                     </div>
                  )}
                </div>
              );
            })}
          </div>

          {galleryQuery.hasNextPage && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => galleryQuery.fetchNextPage()}
                disabled={galleryQuery.isFetchingNextPage}
                className="rounded-full border border-white/10 bg-white/[0.03] px-8 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                {galleryQuery.isFetchingNextPage ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItem && selectedItem.status === "COMPLETED" && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
           onClick={() => { setSelectedId(null); setShowRealisticSettings(false); setViewMode("svg"); }}
         >
           <div 
             className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-2xl"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="grid lg:grid-cols-[1fr_350px]">
                
                {/* Left: Preview Area */}
                <div className="relative flex min-h-[400px] flex-col bg-white/[0.02] lg:min-h-[600px]">
                   {/* Toolbar */}
                   <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                     <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                        <button
                          onClick={() => setViewMode("svg")}
                          className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                            viewMode === "svg" ? "bg-white text-black" : "text-white/60 hover:text-white"
                          }`}
                        >
                          Vector (SVG)
                        </button>
                        <button
                          onClick={() => setViewMode("realistic")}
                          className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                            viewMode === "realistic" ? "bg-white text-black" : "text-white/60 hover:text-white"
                          }`}
                        >
                          Realistic
                        </button>
                     </div>
                     
                     {/* Actions */}
                     <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (selectedItem.svgContent) {
                              const blob = new Blob([selectedItem.svgContent], { type: "image/svg+xml" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `handwriting-${selectedItem.id}.svg`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } else if (selectedItem.fileUrl) {
                              const a = document.createElement("a");
                              a.href = selectedItem.fileUrl;
                              a.target = "_blank";
                              a.rel = "noreferrer";
                              a.click();
                            }
                          }}
                         className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white hover:text-black"
                         title="Download SVG"
                       >
                         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                         </svg>
                       </button>
                       {selectedItem.realisticPng && (
                          <button
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = `data:image/png;base64,${selectedItem.realisticPng}`;
                              a.download = `handwriting-realistic-${selectedItem.id}.png`;
                              a.click();
                            }}
                            className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 text-amber-500 hover:bg-amber-500 hover:text-white"
                            title="Download PNG"
                          >
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                             </svg>
                          </button>
                       )}
                     </div>
                   </div>

                   {/* Canvas */}
                   <div className="flex flex-1 items-center justify-center p-8">
                     <div className="w-full overflow-hidden rounded-xl bg-white shadow-2xl">
                        {viewMode === "svg" ? (
                           selectedItem.svgContent ? (
                             <div className="w-full p-4" dangerouslySetInnerHTML={{ __html: selectedItem.svgContent }} />
                           ) : selectedItem.fileUrl ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={selectedItem.fileUrl} alt="Vector preview" className="w-full" />
                           ) : (
                             <div className="flex aspect-video items-center justify-center bg-gray-50 text-sm text-gray-400">
                               No SVG preview available.
                             </div>
                           )
                        ) : selectedItem.realisticPng ? (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img src={`data:image/png;base64,${selectedItem.realisticPng}`} alt="Realistic" className="w-full" />
                        ) : (
                           <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-gray-50 text-gray-400">
                             <p className="text-sm">No realistic render generated yet.</p>
                             <button
                               onClick={() => setShowRealisticSettings(true)}
                               className="text-xs font-semibold text-black underline"
                             >
                               Configure & Generate
                             </button>
                           </div>
                        )}
                     </div>
                   </div>
                </div>

                {/* Right: Info & Settings */}
                <div className="border-l border-white/5 bg-[#0A0A0A] p-6">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">Details</h3>
                      <button
                        onClick={() => handleDelete(selectedItem.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                   </div>

                   <div className="space-y-6">
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="font-mono text-sm leading-relaxed text-white/80">{selectedItem.text}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <span className="block text-[10px] uppercase tracking-wider text-white/30">Style</span>
                           <span className="text-sm text-white/80">{selectedItem.style}</span>
                         </div>
                         <div>
                           <span className="block text-[10px] uppercase tracking-wider text-white/30">Created</span>
                           <span className="text-sm text-white/80">{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
                         </div>
                         <div>
                           <span className="block text-[10px] uppercase tracking-wider text-white/30">Bias</span>
                           <span className="text-sm text-white/80">{selectedItem.bias}</span>
                         </div>
                         <div>
                           <span className="block text-[10px] uppercase tracking-wider text-white/30">Stroke</span>
                           <div className="flex items-center gap-2">
                             <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: selectedItem.strokeColor }} />
                             <span className="text-sm text-white/80">{selectedItem.strokeWidth}px</span>
                           </div>
                         </div>
                      </div>

                      {/* Realistic Settings */}
                      {(showRealisticSettings || (viewMode === "realistic" && !selectedItem.realisticPng)) && (
                        <div className="mt-8 border-t border-white/5 pt-8 animate-in fade-in slide-in-from-bottom-4">
                          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-amber-500">Realistic Render</h3>
                          
                          <div className="space-y-4">
                            <div>
                               <label className="mb-2 block text-xs text-white/50">Paper Type</label>
                               <div className="grid grid-cols-3 gap-2">
                                 {PAPER_TYPES.map((paper) => (
                                   <button
                                     key={paper.id}
                                     onClick={() => setRealisticSettings((s) => ({ ...s, paperType: paper.id }))}
                                     className={`flex items-center justify-center rounded-lg border p-2 transition ${
                                       realisticSettings.paperType === paper.id
                                         ? "border-amber-500 bg-amber-500/20"
                                         : "border-white/5 hover:border-white/20"
                                     }`}
                                     title={paper.name}
                                   >
                                     <div className={`h-4 w-4 rounded-full ${paper.icon}`} />
                                   </button>
                                 ))}
                               </div>
                            </div>
                            
                            <div>
                               <label className="mb-2 block text-xs text-white/50">Ink Type</label>
                               <select 
                                 value={realisticSettings.inkType}
                                 onChange={(e) => setRealisticSettings(s => ({ ...s, inkType: e.target.value }))}
                                 className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                               >
                                 {INK_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                               </select>
                            </div>

                            <button
                              onClick={handleMakeRealistic}
                              disabled={makeRealisticMutation.isPending}
                              className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                            >
                              {makeRealisticMutation.isPending ? "Rendering..." : "Generate Realistic"}
                            </button>
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => { setSelectedId(null); setShowRealisticSettings(false); setViewMode("svg"); }}
                  className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white/60 hover:bg-black hover:text-white"
                >
                   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                </button>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}
