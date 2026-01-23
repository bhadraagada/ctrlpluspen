"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";

type CsvRow = Record<string, string>;
type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

const STATUS_STYLES: Record<JobStatus, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  PROCESSING: { bg: "bg-blue-500/20", text: "text-blue-400" },
  COMPLETED: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  FAILED: { bg: "bg-red-500/20", text: "text-red-400" },
  CANCELLED: { bg: "bg-gray-500/20", text: "text-gray-400" },
};

export function BulkDashboard() {
  const [view, setView] = useState<"create" | "jobs">("create");
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [textColumn, setTextColumn] = useState<string>("");
  const [filenameColumn, setFilenameColumn] = useState<string>("");
  const [jobName, setJobName] = useState<string>("");
  
  // Handwriting settings
  const [style, setStyle] = useState(9);
  const [bias, setBias] = useState(0.75);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();
  const jobsQuery = api.bulk.getJobs.useQuery({ limit: 20 });
  const statsQuery = api.bulk.getStats.useQuery();
  
  const createJobMutation = api.bulk.createJob.useMutation({
    onSuccess: () => {
      utils.bulk.getJobs.invalidate();
      utils.bulk.getStats.invalidate();
      setCsvData([]);
      setCsvColumns([]);
      setFileName("");
      setTextColumn("");
      setFilenameColumn("");
      setJobName("");
      setView("jobs");
    },
  });

  const cancelJobMutation = api.bulk.cancelJob.useMutation({
    onSuccess: () => {
      utils.bulk.getJobs.invalidate();
      utils.bulk.getStats.invalidate();
    },
  });

  const deleteJobMutation = api.bulk.deleteJob.useMutation({
    onSuccess: () => {
      utils.bulk.getJobs.invalidate();
      utils.bulk.getStats.invalidate();
    },
  });

  const parseCsv = (text: string): { columns: string[]; rows: CsvRow[] } => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { columns: [], rows: [] };
    
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const columns = parseRow(lines[0]!);
    const rows: CsvRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]!);
      const row: CsvRow = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx] ?? "";
      });
      if (Object.values(row).some(v => v.trim() !== "")) {
        rows.push(row);
      }
    }
    
    return { columns, rows };
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { columns, rows } = parseCsv(text);
      setCsvColumns(columns);
      setCsvData(rows);
      if (columns.length > 0) {
        setTextColumn(columns[0]!);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = () => {
    if (!textColumn || csvData.length === 0) return;
    
    const rows = csvData.map((row, idx) => ({
      text: row[textColumn] ?? "",
      filename: filenameColumn ? row[filenameColumn] : undefined,
    })).filter(r => r.text.trim() !== "");
    
    createJobMutation.mutate({
      name: jobName || undefined,
      sourceFileName: fileName,
      rows,
      textColumn,
      filenameColumn: filenameColumn || undefined,
      style,
      bias,
      strokeColor,
      strokeWidth,
    });
  };

  const getProgressPercentage = (job: { totalRows: number; processedCount: number }) => {
    if (job.totalRows === 0) return 0;
    return Math.round((job.processedCount / job.totalRows) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Jobs", value: statsQuery.data?.totalJobs ?? 0, color: "text-white" },
          { label: "Completed", value: statsQuery.data?.completedJobs ?? 0, color: "text-emerald-400" },
          { label: "Processing", value: statsQuery.data?.processingJobs ?? 0, color: "text-blue-400" },
          { label: "Items Generated", value: statsQuery.data?.completedItems ?? 0, color: "text-cyan-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <div className={`text-2xl font-semibold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-white/40">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1 w-fit">
        <button
          onClick={() => setView("create")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            view === "create" ? "bg-white text-black" : "text-white/60 hover:text-white"
          }`}
        >
          New Job
        </button>
        <button
          onClick={() => setView("jobs")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            view === "jobs" ? "bg-white text-black" : "text-white/60 hover:text-white"
          }`}
        >
          Jobs History
        </button>
      </div>

      {view === "create" ? (
        <div className="space-y-8">
          {/* CSV Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Upload CSV</h3>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                isDragging
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />
              
              {csvData.length > 0 ? (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                    <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">{fileName}</p>
                    <p className="mt-1 text-sm text-white/50">
                      {csvData.length} rows, {csvColumns.length} columns
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCsvData([]);
                      setCsvColumns([]);
                      setFileName("");
                    }}
                    className="text-sm text-white/40 hover:text-white"
                  >
                    Upload different file
                  </button>
                </div>
              ) : (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                    <svg className="h-7 w-7 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="mt-4 font-medium text-white">Drop your CSV file here</p>
                  <p className="mt-1 text-sm text-white/40">or click to browse</p>
                </>
              )}
            </div>
          </div>

          {csvData.length > 0 && (
            <>
              {/* Column Mapping */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Column Mapping</h3>
                <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">
                      Text Column <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={textColumn}
                      onChange={(e) => setTextColumn(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
                    >
                      {csvColumns.map((col) => (
                        <option key={col} value={col} className="bg-[#0a0a0a]">
                          {col}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-white/40">Content to convert to handwriting</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">
                      Filename Column <span className="text-white/30">(optional)</span>
                    </label>
                    <select
                      value={filenameColumn}
                      onChange={(e) => setFilenameColumn(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
                    >
                      <option value="" className="bg-[#0a0a0a]">Auto-generate filenames</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col} className="bg-[#0a0a0a]">
                          {col}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-white/40">Output file names (defaults to row number)</p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Preview (first 5 rows)</h3>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-white/10 bg-white/[0.02]">
                        <tr>
                          <th className="px-4 py-3 font-medium text-white/50">#</th>
                          <th className="px-4 py-3 font-medium text-white/50">Text</th>
                          <th className="px-4 py-3 font-medium text-white/50">Filename</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {csvData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 text-white/40">{idx + 1}</td>
                            <td className="max-w-md truncate px-4 py-3 text-white">
                              {row[textColumn] ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-white/60">
                              {filenameColumn ? row[filenameColumn] ?? "-" : `output-${idx + 1}.svg`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Handwriting Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Handwriting Settings</h3>
                <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Style</label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
                    >
                      {Array.from({ length: 13 }, (_, i) => (
                        <option key={i} value={i} className="bg-[#0a0a0a]">
                          Style {i}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">
                      Bias: {bias.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1.25"
                      step="0.05"
                      value={bias}
                      onChange={(e) => setBias(Number(e.target.value))}
                      className="w-full accent-white"
                    />
                    <p className="text-xs text-white/40">Higher = more legible</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Stroke Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => setStrokeColor(e.target.value)}
                        className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                      />
                      <input
                        type="text"
                        value={strokeColor}
                        onChange={(e) => setStrokeColor(e.target.value)}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-white/30"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">
                      Stroke Width: {strokeWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>
                </div>
              </div>

              {/* Job Name & Submit */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2 sm:w-80">
                  <label className="text-sm font-medium text-white/70">
                    Job Name <span className="text-white/30">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="My batch job"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCsvData([]);
                      setCsvColumns([]);
                      setFileName("");
                    }}
                    className="rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={createJobMutation.isPending || !textColumn}
                    className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                  >
                    {createJobMutation.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Start Job ({csvData.length} credits)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {createJobMutation.error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {createJobMutation.error.message}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Jobs History */
        <div className="space-y-4">
          {jobsQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : jobsQuery.data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
              <div className="rounded-full bg-white/5 p-4">
                <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mt-4 font-medium text-white">No Jobs Yet</h3>
              <p className="mt-2 text-sm text-white/50">Create your first batch job</p>
              <button
                onClick={() => setView("create")}
                className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
              >
                New Job
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobsQuery.data?.items.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="truncate font-medium text-white">
                          {job.name ?? job.sourceFileName}
                        </h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status as JobStatus]?.bg} ${STATUS_STYLES[job.status as JobStatus]?.text}`}>
                          {job.status.toLowerCase()}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/40">
                        <span>{job.totalRows} items</span>
                        <span>{job.creditsUsed} credits</span>
                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {(job.status === "PROCESSING" || job.status === "PENDING") && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Progress</span>
                            <span className="text-white/70">{getProgressPercentage(job)}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                              style={{ width: `${getProgressPercentage(job)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {job.status === "COMPLETED" && job.outputZipUrl && (
                        <a
                          href={job.outputZipUrl}
                          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      )}
                      
                      {(job.status === "PENDING" || job.status === "PROCESSING") && (
                        <button
                          onClick={() => cancelJobMutation.mutate({ id: job.id })}
                          disabled={cancelJobMutation.isPending}
                          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
                        >
                          Cancel
                        </button>
                      )}
                      
                      {(job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") && (
                        <button
                          onClick={() => deleteJobMutation.mutate({ id: job.id })}
                          disabled={deleteJobMutation.isPending}
                          className="rounded-lg border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
