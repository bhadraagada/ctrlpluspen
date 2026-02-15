# Module 2: Survey of Technologies

## 2.1 Frontend – Next.js 15 + React 19

- **One-framework stack** – Synthesis pages and API routes live in the same project, so gallery views and `/api/trpc` share code and types.
- **Server-side rendering** for landing pages → faster first paint, SEO-friendly HTML, and optimized handwriting previews.
- **App Router** with React Server Components for streaming responses and reduced client JavaScript.
- **Developer productivity** – built-in TypeScript, hot reload, automatic code-splitting, and optimistic UI updates.
- **Marketing site** – Separate Vite + React Router app with 10 brutalist design showcases for visual impact.

## 2.2 Styling & UI – Tailwind CSS 4 + Radix UI

- **Tailwind utility classes** = rapid, consistent styling; tiny CSS bundle and responsive variants out-of-the-box.
- **Radix UI headless primitives** supply accessible dialogs, selects, sliders, tabs, etc.; we skin them with Tailwind to match the handwriting aesthetic.
- **Motion (Framer Motion 12)** for smooth page transitions, scroll-triggered reveals, and gallery animations.
- **Custom fonts** – Fontsource packages (Caveat for handwriting preview, Outfit for UI, Bebas Neue for headers, Courier Prime and Space Mono for monospace displays).
- **Spline** for 3D interactive components on landing pages.

## 2.3 Language – TypeScript 5.9

- **Compile-time type checks** catch data-shape bugs early and make refactors safe across 18+ Prisma models.
- **Rich IntelliSense** doubles as living documentation; shared types flow from DB schema → tRPC → UI.
- **End-to-end type safety** – tRPC ensures client and server share identical types, eliminating API contract mismatches.

## 2.4 Backend & Data

### API Layer
- **tRPC 11** – Type-safe API procedures for synthesis, gallery, teams, credits, templates, bulk processing, and OCR. Eliminates REST boilerplate and provides compile-time guarantees.
- **Next.js API routes** handle authentication (NextAuth), file uploads (UploadThing), payments (Razorpay), and background jobs (Inngest).
- **Python FastAPI** – Dedicated synthesis API serving LSTM model inference, realistic rendering, and TrOCR recognition with OpenAPI documentation.

### Database
- **PostgreSQL (Neon)** – Relational database with ACID guarantees; users, generations, teams, credits, and templates map cleanly to tables; foreign-key and unique constraints prevent duplicate generations.
- **Prisma ORM 6** – Type-safe database client with auto-generated TypeScript types, declarative migrations, and connection pooling.
- **18+ models** including User, SavedGeneration, Team, Template, BatchJob, BulkJob, Payment, and Usage tracking.

### Background Jobs
- **Inngest** – Event-driven job orchestration for batch synthesis (parallel style variants), bulk CSV processing, and scheduled credit claims with automatic retries.

## 2.5 AI/ML Stack

### Neural Synthesis
- **TensorFlow 2.15 + tf-keras 2.15** – LSTM RNN with 400 units and Mixture Density Network (MDN) output head modeling 20 Gaussian components for stroke generation.
- **tensorflow-probability 0.23** – Mixture distribution sampling for diverse handwriting.
- **13 pre-trained style embeddings** with bias parameter (0-1.5) controlling randomness vs. style adherence.
- **Attention mechanism** with 10 mixture components for character-stroke alignment.

### Realistic Rendering
- **OpenCV (opencv-python-headless)** – Image filtering, morphological operations, and noise injection for wear simulation.
- **Pillow 10** – Image compositing, format conversion, and texture overlay for paper/ink effects.
- **CairoSVG 2.7** – SVG-to-PNG rasterization with anti-aliasing.
- **6 paper types** (white, cream, aged, lined, grid, recycled) and **5 ink types** (ballpoint, gel, fountain, marker, pencil).

### Handwriting Recognition
- **PyTorch 2.0 + Transformers 4.35** – TrOCR (microsoft/trocr-base-handwritten) for image-to-text conversion.
- **EasyOCR 1.7** – Fallback OCR for low-confidence lines supporting 80+ languages.
- **PySpellChecker + autocorrect** – Dictionary-based spell correction and context-aware autocorrection.

### Scientific Computing
- **NumPy 1.23** – Stroke data manipulation, normalization, and image array operations.
- **SciPy 1.10** – Signal processing for stroke smoothing and interpolation.
- **Matplotlib 3.7** – Visualization during development and debugging.
- **svgwrite 1.4** – SVG path generation from stroke sequences.

## 2.6 Supporting Libraries

### Authentication & Security
- **NextAuth.js 5** – OAuth 2.0 (Google, Discord) and credentials-based authentication with JWT sessions and Prisma adapter.
- **bcryptjs** – Password hashing with salt for credential security.

### Data Fetching & Validation
- **@tanstack/react-query 5** – Server state management with optimistic updates for gallery favorites/tags and automatic background refetching.
- **Zod** – TypeScript-first schema validation for input text, style parameters, credit transactions, and team roles.
- **SuperJSON** – Complex data type serialization (Date, Map, Set) through tRPC.
- **@t3-oss/env-nextjs** – Environment variable validation ensuring type-safe configuration.

### File Upload & Storage
- **UploadThing** – Type-safe file uploads for SVG/PNG storage with CDN delivery and automatic optimization.
- **react-dropzone** – Drag-and-drop interface for bulk CSV and OCR image uploads.

### UI Utilities
- **class-variance-authority** – Type-safe component variant management.
- **tailwind-merge** – Intelligent Tailwind class merging to prevent conflicts.
- **clsx** – Conditional className composition.

### Date & Data Processing
- **date-fns** – Painless time math and formatting for timestamps and usage logs.
- **csv-parser** – Fast server-side CSV parsing for bulk text processing.

## 2.7 Payment Gateway

- **Razorpay Node.js SDK**: Indian payment gateway facilitating seamless payment processing. Supports UPI (QR and intent), cards, netbanking, and wallets. Ensures secure transactions with order creation, signature verification, and webhook support.
- **Credit Packages**: Starter (₹399/100 credits), Pro (₹1199/350 credits), Enterprise (₹3999/1500 credits).
- **Test mode** for development with sandbox keys and simulated payment flows.

## 2.8 Development Environment & Infrastructure

### IDE & Tools
- **Visual Studio Code (VS Code)**: Powerful, lightweight IDE with extensive ecosystem of extensions (Prisma, ESLint, Tailwind IntelliSense, Python), robust debugging tools, and Git integration.
- **ESLint 9** – Code linting with Next.js configuration, React hooks rules, and custom project rules.

### Monorepo & Build Tools
- **Turborepo** – High-performance monorepo build system with parallel task execution, intelligent caching, and dependency graph analysis.
- **Bun** – Ultra-fast JavaScript runtime and package manager (10-100x faster than npm) with native TypeScript execution.
- **Vite 7** – Lightning-fast build tool for marketing app with HMR and optimized production builds.

### Version Control & Deployment
- **Git + GitHub** – Version control with conventional commits and CI/CD pipelines.
- **Vercel** – Deployment platform for Next.js with automatic previews, edge functions, and serverless scaling.
- **Neon** – Serverless PostgreSQL with automatic scaling, connection pooling, and branching for development.

## 2.9 Monorepo Structure

The project is organized as a monorepo with three main applications:

```
monorepo/
├── apps/
│   ├── web/              # Next.js 15 main application (synthesis, gallery, teams)
│   ├── marketing/        # Vite + React marketing site (10 brutalist designs)
│   └── synthesis-api/    # Python FastAPI synthesis service (LSTM, TrOCR, rendering)
└── packages/
    └── shared-config/    # Shared ESLint, TypeScript configs
```

---

These technologies collectively provide a **robust, scalable, and production-ready foundation** for an AI-powered handwriting synthesis platform combining state-of-the-art machine learning with modern full-stack web development practices.
