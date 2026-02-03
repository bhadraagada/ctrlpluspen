"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Script from "next/script";
import type { RazorpayPaymentResponse } from "~/types/razorpay";

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const utils = api.useUtils();
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

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

  const createOrder = async (packageId: string, amount: number, credits: number) => {
    const response = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount * 100,
        credits,
        packageId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create order");
    }

    return response.json();
  };

  const verifyPayment = async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    paymentId: string
  ) => {
    const response = await fetch("/api/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paymentId,
      }),
    });

    return response.json();
  };

  const handlePayment = async (pkg: { id: string; name: string; price: number; credits: number }) => {
    if (!session?.user) {
      setPaymentStatus({
        type: "error",
        message: "Please sign in to purchase credits",
      });
      return;
    }

    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      setPaymentStatus({
        type: "error",
        message: "Payment system is not configured. Please contact support.",
      });
      return;
    }

    setProcessingPackageId(pkg.id);
    setPaymentStatus({ type: null, message: "" });

    try {
      const orderData = await createOrder(pkg.id, pkg.price, pkg.credits);

      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Handwriting Studio",
        description: `${pkg.credits} Credits - ${pkg.name} Package`,
        order_id: orderData.orderId,
        handler: async function (response: RazorpayPaymentResponse) {
          try {
            const result = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              orderData.paymentId
            );

            if (result.isOk) {
              setPaymentStatus({
                type: "success",
                message: `${result.creditsAdded} credits added to your account`,
              });
              void utils.credits.getBalance.invalidate();
              void utils.credits.getPaymentHistory.invalidate();
            } else {
              setPaymentStatus({
                type: "error",
                message: result.error || "Payment verification failed",
              });
            }
          } catch {
            setPaymentStatus({
              type: "error",
              message: "Payment verification failed. Please contact support.",
            });
          }
        },
        prefill: {
          name: session.user.name || "",
          email: session.user.email || "",
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: function () {
            setProcessingPackageId(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        setPaymentStatus({
          type: "error",
          message: response.error.description || "Payment failed",
        });
        setProcessingPackageId(null);
      });

      razorpay.open();
    } catch (error) {
      setPaymentStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to initiate payment",
      });
    } finally {
      setProcessingPackageId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />

      <div className="relative mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6">
        
        {/* Background Accents - Subtle Glows */}
        <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-white/[0.02] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-white/[0.02] blur-3xl" />

        {/* Header */}
        <div className="relative mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-medium tracking-tight text-white">Credits</h1>
            <p className="mt-2 text-white/50">
              Fuel your synthesis and recognition tasks.
            </p>
          </div>
          
          {paymentStatus.type && (
             <div className={`animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3 rounded-full border px-4 py-2 text-sm backdrop-blur-md ${
               paymentStatus.type === "success" 
                 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                 : "border-red-500/20 bg-red-500/10 text-red-400"
             }`}>
               <span className={`h-2 w-2 rounded-full ${paymentStatus.type === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
               {paymentStatus.message}
               <button 
                 onClick={() => setPaymentStatus({ type: null, message: "" })} 
                 className="ml-2 opacity-50 hover:opacity-100"
               >
                 ✕
               </button>
             </div>
          )}
        </div>

        {/* Bento Grid Layout for Status */}
        <div className="relative mb-16 grid gap-6 md:grid-cols-3">
          
          {/* Main Balance Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition-all hover:bg-white/[0.05] md:col-span-2">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-white/40">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Available Balance
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-7xl font-semibold tracking-tighter text-white">
                    {balance?.credits ?? 0}
                  </span>
                  <span className="text-xl text-white/40">credits</span>
                </div>
              </div>
              <div className="mt-8">
                <p className="max-w-md text-sm text-white/60">
                  One credit equals one synthesis generation or one OCR document scan.
                  Credits never expire.
                </p>
              </div>
            </div>
            {/* Decorative background element */}
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/[0.02] blur-2xl transition-all group-hover:bg-white/[0.04]" />
          </div>

          {/* Daily Reward Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition-all hover:border-white/20">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-white/40">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Daily Refill
              </div>
              <h3 className="mt-4 text-2xl font-medium text-white">Free Credits</h3>
              <p className="mt-2 text-sm text-white/60">
                Claim 5 free credits every 24 hours to keep building.
              </p>
            </div>
            
            <button
              onClick={() => addFreeCredits.mutate({ amount: 5 })}
              disabled={addFreeCredits.isPending}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/5 disabled:hover:text-white"
            >
              {addFreeCredits.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </>
              ) : (
                "Claim +5 Credits"
              )}
            </button>
            {addFreeCredits.error && (
               <p className="absolute bottom-3 left-0 w-full text-center text-xs text-red-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                 {addFreeCredits.error.message}
               </p>
            )}
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-20">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-medium text-white">Top up</h2>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Secure Payment via Razorpay
            </div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-3">
            {packages?.map((pkg) => (
              <div
                key={pkg.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
                  pkg.popular
                    ? "border-white/20 bg-white/[0.08] shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)]"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <div className="p-8">
                  <div className="flex items-center justify-between">
                     <h3 className="font-medium text-white">{pkg.name}</h3>
                     {pkg.popular && (
                       <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                         Best Value
                       </span>
                     )}
                  </div>
                  
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold text-white">
                      {pkg.price.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-white/50">
                    {pkg.credits} credits · {(pkg.price / pkg.credits).toFixed(2)}/credit
                  </div>

                  <p className="mt-6 text-sm leading-relaxed text-white/60">
                    {pkg.description || "Standard credit pack for synthesis and recognition tasks."}
                  </p>
                </div>

                <div className="mt-auto p-8 pt-0">
                  <button
                    onClick={() => handlePayment(pkg)}
                    disabled={processingPackageId === pkg.id}
                    className={`w-full rounded-xl py-3 text-sm font-medium transition-all duration-300 ${
                      pkg.popular
                        ? "bg-white text-black hover:scale-[1.02] hover:shadow-lg"
                        : "bg-white/10 text-white hover:bg-white hover:text-black"
                    } disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                     {processingPackageId === pkg.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Processing
                        </span>
                      ) : (
                        "Purchase"
                      )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* History Section */}
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-xl font-medium text-white">Transaction History</h2>
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
            {paymentHistory && paymentHistory.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-6 py-4 text-white/60">
                        {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 text-white/80">
                        {payment.credits} Credits Top-up
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-white/60">
                        {payment.amount > 0
                          ? payment.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })
                          : "Free"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                           payment.status === "COMPLETED"
                             ? "bg-emerald-500/10 text-emerald-400"
                             : "bg-white/5 text-white/40"
                        }`}>
                          {payment.status === "COMPLETED" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                          {payment.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                 <div className="rounded-full bg-white/5 p-4">
                   <svg className="h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                 </div>
                 <p className="mt-4 text-white/40">No transactions recorded yet.</p>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </>
  );
}
