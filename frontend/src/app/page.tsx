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
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-10 h-64 w-64 rotate-6 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-16 top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-lg -translate-x-1/2 rounded-[999px] bg-linear-to-r from-cyan-500/15 via-transparent to-indigo-500/10 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="pill bg-white/5 text-white/80">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_0_6px_rgba(34,211,238,0.18)]" />
              Handwriting studio for builders
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl">
                Ink-like handwriting, <br className="hidden sm:block" />{" "}
                engineered for product UIs.
              </h1>
              <p className="max-w-2xl text-lg text-white/70">
                Turn plain text into expressive, vector handwriting or reverse
                it back to clean text with OCR. Built for exports, production
                workflows, and fast iteration.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-cyan-500 to-indigo-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
              >
                Start free — 10 credits
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-base font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                See the flow
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/30 backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/60">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-strong relative overflow-hidden rounded-[20px] border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-6 shadow-2xl shadow-cyan-500/20">
            <div className="absolute inset-x-10 top-8 h-32 rounded-full bg-linear-to-r from-cyan-500/10 to-indigo-500/10 blur-3xl" />
            <div className="relative space-y-4 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Live Preview
                  </span>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  GPU ready
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/50">
                  <span>Synthesis</span>
                  <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200">
                    SVG
                  </span>
                </div>
                <p className="text-lg font-semibold text-white">
                  "Sketching product concepts with pen-like strokes"
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-white/60">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Style 09
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Bias 0.75
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Ink Navy
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/50">
                  <span>OCR</span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                    Confidence 92%
                  </span>
                </div>
                <p className="text-sm text-white/80">
                  "Ship dashboard refresh by Friday." → Ship dashboard refresh
                  by Friday.
                </p>
                <div className="mt-3 flex items-center gap-3 text-[12px] text-white/60">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    YOLOv8 detection
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    TrOCR recognition
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-linear-to-r from-cyan-500/10 via-transparent to-indigo-500/10 px-4 py-3 text-white/80">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Credits
                  </p>
                  <p className="text-lg font-semibold text-white">
                    10 free on signup
                  </p>
                </div>
                <Link
                  href="/auth/signup"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Claim
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/60">
              Capabilities
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Two tracks, one workspace.
            </h2>
            <p className="mt-1 text-white/70">
              Swap between synthesis and OCR without changing tools.
            </p>
          </div>
          <Link
            href="/history"
            className="hidden items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white md:inline-flex"
          >
            View history
            <span className="text-white/50">→</span>
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {featureCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition duration-200 hover:border-white/30 hover:shadow-xl hover:shadow-cyan-500/15"
            >
              <div
                className={`absolute inset-0 opacity-0 blur-3xl transition duration-300 group-hover:opacity-80 bg-linear-to-br ${card.color}`}
              />
              <div className="relative flex items-center justify-between">
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  {card.badge}
                </div>
                <span className="text-white/60">Launch →</span>
              </div>
              <h3 className="relative mt-4 text-2xl font-semibold text-white">
                {card.title}
              </h3>
              <div className="relative mt-4 space-y-2 text-white/75">
                {card.points.map((point) => (
                  <div key={point} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-white/70" />
                    <p className="text-sm">{point}</p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/60">
                Workflow
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Zero-friction flow from idea to export.
              </h2>
            </div>
            <Link
              href="/auth/signup"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Try it now
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between text-white/60">
                  <span className="text-sm uppercase tracking-[0.18em]">
                    Step {idx + 1}
                  </span>
                  <span className="h-8 w-8 rounded-full bg-white/10 text-center text-base font-semibold leading-8 text-white">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-white/70">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-white/60">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Simple credits for both tracks.
          </h2>
          <p className="mt-2 text-white/70">
            One credit powers a synthesis or OCR run. Keep it predictable.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
              Starter
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">$4.99</p>
            <p className="text-white/60">50 credits</p>
            <p className="mt-3 text-sm text-white/70">
              Best for sampling the handwriting styles.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/60 bg-linear-to-br from-cyan-500/10 via-transparent to-indigo-500/10 p-6 text-left shadow-xl shadow-cyan-500/20">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/70">
              <span>Most picked</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                Value
              </span>
            </div>
            <p className="mt-3 text-4xl font-semibold text-white">$14.99</p>
            <p className="text-white/60">200 credits</p>
            <p className="mt-3 text-sm text-white/80">
              Enough to cover weekly synth runs and OCR checks.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
              Enterprise
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">$49.99</p>
            <p className="text-white/60">1000 credits</p>
            <p className="mt-3 text-sm text-white/70">
              For teams shipping handwriting-heavy experiences.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
