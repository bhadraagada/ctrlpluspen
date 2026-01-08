"use client";

import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function HistoryPage() {
  const { data: session, status } = useSession();

  const { data: usageData, isLoading } = api.ocr.getUsageHistory.useQuery(
    { limit: 50 },
    { enabled: !!session }
  );

  const { data: stats } = api.ocr.getUsageStats.useQuery(undefined, {
    enabled: !!session,
  });

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Usage History</h1>
        <p className="mt-1 text-gray-400">View your OCR processing history</p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-800/50 p-4">
            <p className="text-sm text-gray-400">Total Scans</p>
            <p className="mt-1 text-2xl font-bold">{stats.totalScans}</p>
          </div>
          <div className="rounded-lg bg-gray-800/50 p-4">
            <p className="text-sm text-gray-400">Credits Used</p>
            <p className="mt-1 text-2xl font-bold">{stats.totalCreditsUsed}</p>
          </div>
          <div className="rounded-lg bg-gray-800/50 p-4">
            <p className="text-sm text-gray-400">This Month</p>
            <p className="mt-1 text-2xl font-bold">{stats.thisMonthScans}</p>
          </div>
          <div className="rounded-lg bg-gray-800/50 p-4">
            <p className="text-sm text-gray-400">Characters Recognized</p>
            <p className="mt-1 text-2xl font-bold">
              {stats.totalCharactersRecognized.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Usage History Table */}
      {usageData && usageData.items.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  Regions
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  Characters
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  Processing Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  Credits
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {usageData.items.map((usage) => (
                <tr key={usage.id} className="bg-gray-800/50">
                  <td className="px-4 py-3 text-sm">
                    {new Date(usage.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {usage.regionsDetected ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {usage.charactersRecognized ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {usage.processingTimeMs
                      ? `${usage.processingTimeMs.toFixed(0)}ms`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-yellow-400">
                    -{usage.creditsUsed}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {usage.success ? (
                      <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                        Success
                      </span>
                    ) : (
                      <span
                        className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400"
                        title={usage.errorMessage ?? undefined}
                      >
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-12 w-12 text-gray-500"
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
          <p className="mt-4 text-gray-400">No usage history yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Start by uploading an image on the dashboard
          </p>
        </div>
      )}
    </div>
  );
}
