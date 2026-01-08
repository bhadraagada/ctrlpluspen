"use client";

import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const utils = api.useUtils();

  const { data: balance } = api.credits.getBalance.useQuery(undefined, {
    enabled: !!session,
  });

  const { data: packages } = api.credits.getPackages.useQuery();

  const { data: paymentHistory } = api.credits.getPaymentHistory.useQuery(
    { limit: 10 },
    { enabled: !!session }
  );

  const addFreeCredits = api.credits.addFreeCredits.useMutation({
    onSuccess: () => {
      void utils.credits.getBalance.invalidate();
      void utils.credits.getPaymentHistory.invalidate();
    },
  });

  if (status === "loading") {
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
        <h1 className="text-3xl font-bold">Credits & Billing</h1>
        <p className="mt-1 text-gray-400">
          Manage your credits and view payment history
        </p>
      </div>

      {/* Current Balance */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-100">Current Balance</p>
            <p className="mt-1 text-4xl font-bold">{balance?.credits ?? 0}</p>
            <p className="text-sm text-blue-200">credits available</p>
          </div>
          <button
            onClick={() => addFreeCredits.mutate({ amount: 5 })}
            disabled={addFreeCredits.isPending}
            className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/30 disabled:opacity-50"
          >
            {addFreeCredits.isPending ? "Adding..." : "Claim 5 Free Credits"}
          </button>
        </div>
        {addFreeCredits.error && (
          <p className="mt-2 text-sm text-red-200">
            {addFreeCredits.error.message}
          </p>
        )}
        {addFreeCredits.isSuccess && (
          <p className="mt-2 text-sm text-green-200">
            Successfully added {addFreeCredits.data.creditsAdded} credits!
          </p>
        )}
      </div>

      {/* Credit Packages */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Buy Credits</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {packages?.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-xl border p-6 transition-colors ${
                pkg.popular
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{pkg.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                ${pkg.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">{pkg.credits} credits</p>
              {pkg.description && (
                <p className="mt-3 text-sm text-gray-400">{pkg.description}</p>
              )}
              <button
                className={`mt-4 w-full rounded-lg py-2 font-medium transition-colors ${
                  pkg.popular
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                Buy Now
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                ${(pkg.price / pkg.credits).toFixed(3)} per credit
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          Payment integration coming soon. Use daily free credits for now!
        </p>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Transaction History</h2>
        {paymentHistory && paymentHistory.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Credits
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="bg-gray-800/50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400">
                      +{payment.credits}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.amount > 0 ? `$${payment.amount.toFixed(2)}` : "Free"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          payment.status === "COMPLETED"
                            ? "bg-green-500/20 text-green-400"
                            : payment.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
            <p className="text-gray-400">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
