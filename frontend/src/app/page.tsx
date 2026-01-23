import Link from "next/link";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  // If logged in, redirect to synthesis (primary feature)
  if (session) {
    redirect("/synthesis");
  }

  const stats = [
    { label: "Hand styles", value: "13", detail: "Curated alphabets" },
    { label: "OCR stack", value: "YOLO + TrOCR", detail: "Detect + read" },
    { label: "Output", value: "SVG", detail: "Vector strokes" },
  ];

  const featureCards = [
    {
      title: "Handwriting Synthesis",
      badge: "Primary",
      color: "from-cyan-500/20 via-cyan-400/10 to-indigo-500/20",
      points: [
        "Type once, export as clean SVG",
        "13 styles with ink, width, and bias controls",
        "Download-ready vector output for print or product",
      ],
      href: "/synthesis",
    },
    {
      title: "Handwriting OCR",
      badge: "Bonus",
      color: "from-amber-500/20 via-orange-400/10 to-rose-500/20",
      points: [
        "YOLOv8 region detection + TrOCR recognition",
        "Confidence filters and preprocessing on upload",
        "Copy, audit, and export detected text instantly",
      ],
      href: "/dashboard",
    },
  ];

  const steps = [
    {
      title: "Write or capture",
      description:
        "Enter text for synthesis or drop a handwritten image for OCR.",
    },
    {
      title: "Tune controls",
      description:
        "Pick style, bias, stroke color, and thresholds before running.",
    },
    {
      title: "Generate in seconds",
      description:
        "GPU-backed inference produces SVG or clean text almost instantly.",
    },
    {
      title: "Export & ship",
      description:
        "Download SVG, copy text, and move straight into your workflow.",
    },
  ];

  return (
    <div className="relative overflow-hidden bg-[#030303] text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Elements */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] h-[400px] w-[400px] rounded-full bg-cyan-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 lg:pt-32 pb-20 lg:pb-32 px-6">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-white/70 hover:bg-white/10 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Handwriting Studio v1.0
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">
                Ink-like realism.
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">
                Digital precision.
              </span>
            </h1>

            <p className="text-lg text-white/90 max-w-xl leading-relaxed">
              Transform typed text into expressive, vector-based handwriting. Or
              reverse engineer ink back to text with our advanced OCR stack. The
              ultimate toolkit for digital creators.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-white px-8 font-medium text-black transition-all duration-300 hover:bg-white/90 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                <span className="mr-2 !text-black">Start Creating</span>
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  ></path>
                </svg>
              </Link>

              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 font-medium text-white transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                Explore Features
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/50 uppercase tracking-wider mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Visual - Pure CSS */}
          <div className="relative h-[500px] lg:h-[600px] w-full hidden lg:flex items-center justify-center perspective-[2000px] group">
            {/* Floating Container */}
            <div className="relative w-[320px] h-[460px] [transform-style:preserve-3d] [transform:rotateY(-15deg)_rotateX(5deg)] transition-transform duration-700 ease-out group-hover:[transform:rotateY(-5deg)_rotateX(0deg)]">
              {/* Glowing Backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500/30 to-purple-500/30 rounded-3xl blur-2xl opacity-75 animate-pulse" />

              {/* Main Card */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col p-6 [transform-style:preserve-3d]">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-white/40 font-mono">
                    Generate.svg
                  </div>
                </div>

                {/* Card Content (Simulated Handwriting) */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="h-2 w-20 bg-white/10 rounded-full" />
                    <p className="text-2xl text-cyan-100 opacity-90 leading-relaxed font-light italic font-serif">
                      &ldquo;The future of{" "}
                      <span className="text-cyan-400">digital</span> ink is
                      here.&rdquo;
                    </p>
                  </div>

                  {/* Animated Processing Lines */}
                  <div className="mt-12 space-y-3">
                    <div className="h-1 w-full bg-gradient-to-r from-cyan-500/50 to-transparent rounded-full animate-pulse" />
                    <div className="h-1 w-2/3 bg-gradient-to-r from-purple-500/50 to-transparent rounded-full animate-pulse [animation-delay:200ms]" />
                    <div className="h-1 w-3/4 bg-gradient-to-r from-indigo-500/50 to-transparent rounded-full animate-pulse [animation-delay:400ms]" />
                  </div>
                </div>

                {/* Floating Element 1 (Badge) */}
                <div className="absolute -right-8 top-10 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-lg [transform:translateZ(40px)]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Floating Element 2 (Status) */}
                <div className="absolute -left-6 bottom-20 bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg shadow-lg [transform:translateZ(60px)] flex items-center gap-3">
                  <div className="relative w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span className="text-xs font-medium text-white/80">
                    Processing...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-24 px-6 relative z-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Core Capabilities
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Everything you need to bridge the gap between digital text and
              analog expression.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {featureCards.map((card, i) => (
              <Link
                href={card.href}
                key={i}
                className="group relative overflow-hidden rounded-3xl bg-neutral-900/50 border border-white/5 hover:border-white/20 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-900/10"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />

                <div className="relative p-8 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      {i === 0 ? (
                        <svg
                          className="w-8 h-8 text-cyan-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-8 h-8 text-amber-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${i === 0 ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/10" : "border-amber-500/30 text-amber-400 bg-amber-500/10"}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-3xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-colors">
                    {card.title}
                  </h3>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {card.points.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start text-white/80 text-sm"
                      >
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-white/50 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                    Launch Tool{" "}
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Steps / Workflow */}
      <section className="py-24 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">How it works</h2>
              <p className="text-white/80">
                From concept to export in four simple steps.
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Start experimenting →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/20 to-transparent group-hover:from-cyan-500/50 transition-all duration-500" />
                <div className="pt-6">
                  <span className="block text-5xl font-bold text-white/5 mb-4 group-hover:text-white/10 transition-colors">
                    0{idx + 1}
                  </span>
                  <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-cyan-400 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Matches credits page style */}
      <section id="pricing" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-medium text-white">Top up</h2>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Secure Payment via Razorpay
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Starter */}
            <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">Starter</h3>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-white">
                    ₹399
                  </span>
                </div>
                <div className="mt-2 text-sm text-white/95">
                  50 credits · ₹7.98/credit
                </div>

                <p className="mt-6 text-sm leading-relaxed text-white/95">
                  Perfect for trying out the service
                </p>
              </div>

              <div className="mt-auto p-8 pt-0">
                <Link
                  href="/auth/signup"
                  className="block w-full rounded-xl bg-white/90 py-3 text-center text-sm font-medium text-black !text-black transition-all duration-300 hover:bg-white hover:scale-[1.02] hover:shadow-lg"
                >
                  Purchase
                </Link>
              </div>
            </div>

            {/* Pro - Popular */}
            <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)] transition-all duration-300">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">Pro</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                    Best Value
                  </span>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-white">
                    ₹1,199
                  </span>
                </div>
                <div className="mt-2 text-sm text-white/95">
                  200 credits · ₹6.00/credit
                </div>

                <p className="mt-6 text-sm leading-relaxed text-white/95">
                  Best value for regular users
                </p>
              </div>

              <div className="mt-auto p-8 pt-0">
                <Link
                  href="/auth/signup"
                  className="block w-full rounded-xl bg-white py-3 text-center text-sm font-medium !text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                >
                  Purchase
                </Link>
              </div>
            </div>

            {/* Enterprise */}
            <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">Enterprise</h3>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-white">
                    ₹3,999
                  </span>
                </div>
                <div className="mt-2 text-sm text-white/95">
                  1000 credits · ₹4.00/credit
                </div>

                <p className="mt-6 text-sm leading-relaxed text-white/95">
                  For high-volume users
                </p>
              </div>

              <div className="mt-auto p-8 pt-0">
                <Link
                  href="/auth/signup"
                  className="block w-full rounded-xl bg-white/90 py-3 text-center text-sm font-medium !text-black transition-all duration-300 hover:bg-white hover:scale-[1.02] hover:shadow-lg"
                >
                  Purchase
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 text-center md:text-left">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center text-white/70 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Handwriting Studio. All rights
            reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Twitter
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
