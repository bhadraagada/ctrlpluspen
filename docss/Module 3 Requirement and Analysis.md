# Module 3: Requirement and Analysis

## 3.1 Problem Definition

Traditional handwriting digitization tools rely on fixed fonts, basic rule-based systems, or manual writing, resulting in outputs that lack natural flow, personal character, and authentic human imperfections. Users struggle to create realistic handwritten content for documents, communications, creative projects, and assistive applications without spending hours manually writing. A solution is needed to generate authentic AI-powered handwriting that preserves the human touch, supports multiple styles, enables team collaboration, and delivers production-ready outputs across web and mobile platforms.

### 3.1.2 Existing System

Current options (fixed fonts, online handwriting generators, manual writing, or basic stroke-based tools) suffer from:

- **Lack of realism**: Fixed fonts and rule-based systems produce mechanical-looking output with uniform spacing and no natural stroke variation.
- **No personalization**: Limited or no style customization; users cannot replicate specific handwriting characteristics or adjust neatness/randomness.
- **Single-user focus**: No team workspaces, shared credit pools, or collaborative generation management for agencies and studios.
- **Limited output formats**: Most tools export only PNG/JPG rasters; no scalable SVG vectors or realistic paper/ink effects.
- **No post-processing**: Generated handwriting looks digitally "clean" without paper textures, ink variations, or authentic aging effects.
- **Poor cross-device support**: Desktop-only applications with no web-based access, mobile responsiveness, or real-time sync.
- **Manual writing**: Time-consuming, inconsistent, and inaccessible for users with motor impairments or high-volume needs.
- **No usage tracking or analytics**: No credit systems, generation history, or insights into style preferences and productivity.

### 3.1.3 Proposed System

A modern, web-based Handwriting Synthesis platform that provides AI-powered stroke generation using LSTM neural networks with Mixture Density Network outputs, supporting 13 unique handwriting styles with adjustable bias parameters. The platform includes realistic post-processing (6 paper types, 5 ink types, wear simulation), multi-format export (SVG/PNG/PDF), team collaboration with shared credits and role-based access, persistent gallery management with search/tags/favorites, batch and bulk processing via Inngest background jobs, OCR/handwriting recognition using TrOCR, and credit-based usage with Razorpay payments—delivering an intuitive, production-ready handwriting generation experience.

## 3.2 Requirement Specification

### Functional Requirements

**User Registration & Authentication:**
- Google OAuth and Discord OAuth for social login; email/password credentials with bcrypt hashing.
- Profile management with name, email, avatar, and timezone preferences.
- Session management with JWT tokens and automatic refresh.

**Handwriting Synthesis:**
- Create handwriting from text input (max 20 lines × 75 chars/line) with real-time SVG preview.
- Select from 13 pre-trained handwriting styles (0-12) with distinct characteristics.
- Adjust bias parameter (0-1.5) controlling randomness vs. style adherence.
- Customize stroke color (hex picker) and width (1-5px slider).
- Character validation excluding unsupported characters (Q, X, Z uppercase).

**Realistic Rendering:**
- Apply post-processing effects to transform clean SVG into authentic-looking scanned handwriting.
- Select paper type (white, cream, aged, lined, grid, recycled) with texture injection.
- Choose ink type (ballpoint, gel, fountain, marker, pencil) with pressure variation and feathering.
- Control wear level (0-1) for degradation effects (noise, edge erosion, lighting variation).
- Generate realistic PNG exports with base64 encoding or UploadThing CDN storage.

**Gallery Management:**
- Save generated handwriting with metadata (text, style, bias, colors, processing time).
- Search saved generations by text content with full-text search.
- Tag generations with custom labels for organization.
- Mark generations as favorites for quick access.
- Paginated gallery with infinite scroll and filter options (all, favorites, by-style).
- Delete individual generations or batch delete.

**Batch Processing:**
- Generate multiple style variants of the same text in parallel (select multiple styles).
- Background processing via Inngest with progress tracking in gallery.
- Automatic credit deduction upfront; refunds on cancellation.
- View batch status (pending, processing, completed, failed) with per-item details.

**Bulk Operations:**
- Upload CSV files for batch text processing with custom column mapping.
- Process rows sequentially with individual style/bias settings per row.
- Track bulk job progress with success/error counts and logs.
- Export results as ZIP containing all generated SVG/PNG files.
- Cancel in-progress jobs with automatic credit refunds.

**Team Collaboration:**
- Create team workspaces with unique slugs and display names.
- Invite members via email with role-based access (OWNER, ADMIN, MEMBER).
- Shared credit pool at team level for collaborative generation.
- Team-specific galleries for shared handwriting assets.
- Member management (view, promote, demote, remove) with permission checks.

**Template System:**
- 5 system templates (formal letter, sticky note, journal, invitation, certificate).
- WYSIWYG template editor with customizable text areas, positioning, and styling.
- Apply handwriting styles to template text regions.
- Save template documents with metadata and generation status.
- Export template-based documents as PDF (pending implementation).

**OCR/Handwriting Recognition:**
- Upload handwritten images (JPG, PNG) for text extraction.
- Preprocessing with grayscale conversion, thresholding, and line segmentation.
- TrOCR inference on line images with confidence scoring.
- Fallback OCR (EasyOCR) for low-confidence lines.
- Spell correction and autocorrect for improved accuracy.
- Return structured JSON with per-line text and confidence scores.

**Credit System:**
- Free credits on signup (10 credits default).
- 1 credit per synthesis, realistic rendering, OCR recognition, or batch/bulk item.
- Credit packages via Razorpay: Starter (₹399/100 credits), Pro (₹1199/350 credits), Enterprise (₹3999/1500 credits).
- Usage tracking with detailed logs (operation type, credits consumed, timestamp).
- Daily free credit claims (optional, configurable).

**Multi-Format Export:**
- SVG vector export for infinite scalability and editing.
- PNG raster export with realistic effects and configurable resolution.
- PDF export for print-ready documents (via templates).
- Base64 encoding for inline transmission; UploadThing for permanent storage.

**Audit & Activity Log:**
- Track generation creation with text, style, bias, and parameters.
- Log credit transactions (purchases, consumption, refunds).
- Record team invitations, member role changes, and deletions.
- Monitor bulk/batch job status transitions and errors.

### Non-Functional Requirements

**Performance:**
- Synthesis API response time <2s for 100-character inputs.
- Support 100+ concurrent synthesis requests with horizontal FastAPI scaling.
- Database query response time <100ms for gallery pagination.
- Real-time UI updates with optimistic mutations and React Query caching.

**Reliability:**
- 99.8% successful generation rate with automatic error handling.
- Inngest background jobs with automatic retries (3 attempts) and exponential backoff.
- Database ACID guarantees with PostgreSQL constraints preventing duplicates.
- Connection pooling (Prisma) maintaining stable performance under load.

**Security:**
- OAuth 2.0 authentication with secure token handling (NextAuth.js).
- Password hashing with bcrypt salt rounds (10).
- CSRF protection and secure session cookies (httpOnly, sameSite).
- Input validation with Zod schemas rejecting malformed requests.
- SQL injection prevention via Prisma parameterized queries.

**Scalability:**
- Serverless PostgreSQL (Neon) with automatic scaling and connection pooling.
- Horizontal FastAPI synthesis API scaling with load balancing.
- CDN delivery (UploadThing) for static assets and generated files.
- Edge functions (Vercel) for global low-latency API access.

**Usability:**
- Responsive design with mobile-first approach (Tailwind CSS).
- Real-time SVG preview updating on parameter changes.
- Intuitive drag-and-drop for CSV/image uploads.
- Keyboard shortcuts for common actions (gallery navigation, quick synthesis).
- Accessibility with Radix UI primitives (ARIA labels, keyboard navigation).

**Maintainability:**
- Monorepo structure (Turborepo) with clear separation of concerns.
- Type-safe codebase with TypeScript across frontend and tRPC APIs.
- Modular components with single responsibility principle.
- Comprehensive error handling with structured logging.
- Database migrations (Prisma) for schema versioning.

## 3.3 Planning and Scheduling

An implementation-ready plan aligned to the production monorepo workflow:

**Phase 1: Core Infrastructure (Weeks 1-2)**
- Set up Next.js 15 project with App Router and TypeScript.
- Configure Prisma schema with User, SavedGeneration, and Credit models.
- Integrate NextAuth.js with Google/Discord OAuth.
- Build basic synthesis page with FastAPI integration.

**Phase 2: AI/ML Integration (Weeks 3-4)**
- Deploy Python FastAPI synthesis API with TensorFlow LSTM model.
- Implement 13 style models with bias parameter support.
- Build SVG rendering pipeline from stroke sequences.
- Add realistic post-processing with OpenCV/Pillow effects.

**Phase 3: Gallery & Credits (Weeks 5-6)**
- Create gallery UI with search, tags, favorites, and pagination.
- Integrate Razorpay payment gateway with credit packages.
- Build credit consumption tracking and usage logs.
- Implement daily free credit claims.

**Phase 4: Collaboration & Batch (Weeks 7-8)**
- Design team workspace system with roles and invitations.
- Integrate Inngest for background batch processing.
- Build bulk CSV upload with job tracking and ZIP export.
- Add team-specific galleries and shared credit pools.

**Phase 5: Advanced Features (Weeks 9-10)**
- Implement TrOCR handwriting recognition pipeline.
- Build template system with WYSIWYG editor.
- Add marketing site with 10 brutalist design showcases.
- Deploy to Vercel with Neon PostgreSQL production database.

**Phase 6: Testing & Optimization (Weeks 11-12)**
- Unit tests for tRPC procedures and API routes.
- Integration tests for synthesis pipeline and OCR.
- Load testing for concurrent requests and database performance.
- User acceptance testing with diverse text inputs and styles.

## 3.4 Software & Hardware Requirements

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15 • React 19 • Tailwind CSS 4 • Radix UI |
| **Marketing Site** | Vite 7 • React Router 7 • Motion 12 • Spline |
| **API Layer** | tRPC 11 • @tanstack/react-query 5 • SuperJSON |
| **Backend (Web)** | Next.js API Routes • Node.js |
| **Backend (Synthesis)** | Python 3.11 • FastAPI • Uvicorn |
| **Database** | PostgreSQL (Neon) |
| **ORM** | Prisma 6 |
| **Authentication** | NextAuth.js 5 (Google OAuth, Discord OAuth, Credentials) |
| **AI/ML Framework** | TensorFlow 2.15 • tf-keras 2.15 • tensorflow-probability 0.23 |
| **OCR Engine** | PyTorch 2.0 • Transformers 4.35 (TrOCR) • EasyOCR 1.7 |
| **Image Processing** | OpenCV • Pillow 10 • CairoSVG 2.7 • NumPy 1.23 |
| **File Storage** | UploadThing (CDN delivery) |
| **Background Jobs** | Inngest (async processing, retries, cron) |
| **Payment Gateway** | Razorpay (INR, UPI, cards, netbanking) |
| **Monorepo** | Turborepo • Bun |
| **Hosting (Frontend)** | Vercel (Next.js, Edge Functions) |
| **Hosting (Backend)** | Docker • Cloud providers (for FastAPI) |
| **Hosting (Database)** | Neon (Serverless PostgreSQL) |

### Hardware Requirements

- **Processor:** Quad-core CPU (Intel i5/Ryzen 5 or better)
- **RAM:** 8 GB minimum (16 GB recommended for local model inference)
- **Storage:** 512 GB SSD (for models, datasets, generated outputs)
- **GPU:** Optional NVIDIA GPU with CUDA (for faster model inference)
- **Internet:** 25 Mbps or higher (for API calls, file uploads, real-time sync)

## 3.5 Preliminary Product Snapshot

The Handwriting Synthesis platform integrates AI-powered stroke generation, realistic post-processing, and collaborative workflows to deliver a scalable, production-ready solution for authentic handwriting creation, team management, and cross-device asset synchronization.

Modules are as follows:

- **User Registration and Onboarding:** Users sign in (Google OAuth/Discord OAuth/email-password) and complete profile setup with name, avatar, timezone preferences, and receive 10 free credits to start generating handwriting.

- **Synthesis Engine:** AI-powered LSTM neural network generates stroke sequences from text input. Users select from 13 handwriting styles, adjust bias parameter (0-1.5) for randomness control, customize stroke color/width, and receive real-time SVG preview with instant parameter updates.

- **Realistic Rendering:** Post-processing pipeline transforms clean SVG into authentic scanned handwriting. Users select paper type (white, cream, aged, lined, grid, recycled), ink type (ballpoint, gel, fountain, marker, pencil), wear level (0-1), and generate PNG exports with texture injection and degradation effects.

- **Gallery Management:** Persistent storage for all generated handwriting with full-text search, custom tagging, favorites marking, and paginated browsing. Users filter by style, view metadata (text, parameters, processing time), and delete individual or batch items.

- **Team Collaboration:** Create team workspaces with unique slugs, invite members via email with role-based access (OWNER/ADMIN/MEMBER), manage shared credit pools, and maintain team-specific galleries for collaborative handwriting asset management.

- **Batch & Bulk Processing:** Generate multiple style variants in parallel via Inngest background jobs. Upload CSV files for high-volume text processing with custom column mapping, track job progress with success/error counts, and export results as ZIP files containing all generated outputs.

- **Template System:** 5 pre-built templates (formal letter, sticky note, journal, invitation, certificate) with WYSIWYG editor for customizable text areas, positioning, and styling. Apply handwriting styles to template regions and export as PDF for print-ready documents.

- **OCR/Recognition:** Upload handwritten images (JPG/PNG) for text extraction using TrOCR transformer models. System performs preprocessing (grayscale, thresholding, line segmentation), runs inference with confidence scoring, applies spell correction, and returns structured JSON with per-line text.

- **Credit System & Payments:** Track credit balance with 1 credit per synthesis/rendering/OCR operation. Purchase credit packages via Razorpay (Starter ₹399/100 credits, Pro ₹1199/350 credits, Enterprise ₹3999/1500 credits) with order creation, signature verification, and webhook handling for payment status updates.

- **Dashboard & Analytics:** Unified view of generation history, credit consumption trends, style usage statistics, team activity logs, and export format preferences. Monitor batch/bulk job status, view success/error rates, and track processing times for performance insights.

## 3.6 Conceptual Diagrams

The following diagrams describe the system architecture, workflows, and data relationships visually.

### 3.6.1 Event Table

| Event Name | Description | Actor/Source | System Response | Preconditions | Postconditions |
|------------|-------------|--------------|-----------------|---------------|----------------|
| **User Registration** | New user registers via email/password | Guest User | Create user account, hash password, send verification email | Valid email format, password meets requirements | User created with ACTIVE status, 10 free credits assigned |
| **OAuth Login** | User logs in via Google/Discord OAuth | Guest/Registered User | Authenticate via OAuth provider, create/update user account, create session | Valid OAuth account | User authenticated, JWT session created, redirected to dashboard |
| **Password Reset Request** | User requests password reset | Registered User | Generate reset token, send reset email with link | Valid email exists in system | Reset token generated (24hr expiry), email sent |
| **Synthesis Generation** | User generates handwriting from text | Authenticated User | Validate input, call FastAPI LSTM inference, generate SVG, return preview | User has credits, text within limits (20 lines × 75 chars) | SVG handwriting generated, 1 credit consumed, processing time logged |
| **Realistic Rendering** | User applies post-processing effects | Authenticated User | Process SVG with OpenCV/Pillow, apply paper/ink/wear effects, generate PNG | SVG exists, user has credits | Realistic PNG generated, 1 credit consumed, upload to UploadThing |
| **Save to Gallery** | User saves generation to gallery | Authenticated User | Insert SavedGeneration record with metadata | Generation exists in current session | Generation saved with SVG/PNG, searchable in gallery |
| **Gallery Search** | User searches saved generations | Authenticated User | Query database by text content, tags, style filters | User authenticated, gallery has items | Matching generations displayed with pagination |
| **Tag Generation** | User adds tags to saved generation | Authenticated User | Update SavedGeneration tags array | Generation exists and owned by user | Tags added, generation searchable by tag |
| **Favorite Generation** | User marks generation as favorite | Authenticated User | Update isFavorite field to true | Generation exists and owned by user | Generation marked as favorite, appears in favorites filter |
| **Delete Generation** | User deletes saved generation | Authenticated User | Remove SavedGeneration record, delete uploaded files | Generation exists and owned by user | Generation deleted, storage freed |
| **Batch Generation** | User generates multiple style variants | Authenticated User | Create BatchJob, trigger Inngest fan-out, parallel synthesis per style | User has sufficient credits, text valid | BatchJob created, multiple styles generated in parallel, credits consumed per item |
| **Bulk CSV Upload** | User uploads CSV for bulk processing | Authenticated User | Parse CSV, validate columns, create BulkJob with items | Valid CSV format, user has credits | BulkJob created with pending status, rows queued for processing |
| **Bulk Processing** | System processes bulk job rows | Inngest Worker | Process each row sequentially, synthesize handwriting, log results | BulkJob in PENDING status | Each row processed, results stored, ZIP export generated on completion |
| **Credit Purchase** | User purchases credit package | Authenticated User | Create Razorpay order, redirect to payment gateway | User authenticated, valid package selected | Order created, user redirected to Razorpay checkout |
| **Payment Verification** | Razorpay webhook confirms payment | Razorpay Server | Verify payment signature, add credits to user account | Valid order ID and payment ID | Credits added to user balance, Payment record created with SUCCESS status |
| **Team Creation** | User creates team workspace | Authenticated User | Create Team record, assign creator as OWNER, initialize shared credits | Unique team slug available | Team created, creator as OWNER, team credit pool initialized |
| **Team Invitation** | Team owner/admin invites member | Team Owner/Admin | Create TeamInvite record, generate unique token, send email invitation | User has OWNER/ADMIN role, valid email | TeamInvite created with 7-day expiry, invitation email sent |
| **Accept Team Invite** | User accepts team invitation | Invited User | Verify token, create TeamMember record with assigned role | Valid token, not expired, user authenticated | User added to team with specified role, invite record deleted |
| **Team Member Role Update** | Owner/admin changes member role | Team Owner/Admin | Update TeamMember role field | User has OWNER/ADMIN role, target member exists | Member role updated (ADMIN ↔ MEMBER), permissions changed |
| **Team Member Removal** | Owner/admin removes team member | Team Owner/Admin | Delete TeamMember record, transfer/delete member's team generations | User has OWNER/ADMIN role, not removing self | Member removed from team, access revoked |
| **OCR Upload** | User uploads handwriting image for recognition | Authenticated User | Validate image format/size, preprocess image, segment lines | User has credits, valid image format (JPG/PNG) | Image uploaded, preprocessed, queued for OCR |
| **OCR Processing** | System recognizes handwriting text | FastAPI Worker | Run TrOCR inference per line, apply spell correction, return structured JSON | Image preprocessed and segmented | Text extracted with confidence scores, 1 credit consumed |
| **Template Creation** | User creates custom template | Authenticated User/Team | Create Template record with WYSIWYG config | User authenticated, valid template type | Template created, available in template library |
| **Template Document Generation** | User generates document from template | Authenticated User | Apply handwriting to template regions, render document | Template exists, user has credits | TemplateDocument created with rendered output, credits consumed |
| **Session Timeout** | User session expires after inactivity | System Timer | Invalidate JWT session, clear cookies | Session idle timeout reached (7 days) | User logged out, must re-authenticate |
| **Daily Credit Claim** | User claims daily free credits | Authenticated User | Check last claim timestamp, add credits if eligible | 24 hours since last claim | Free credits added (configurable amount), timestamp updated |
| **Inngest Job Retry** | Background job fails and retries | Inngest Worker | Log error, exponential backoff, retry job (max 3 attempts) | Job failed with retryable error | Job retried with backoff, success/failure logged |
| **Database Backup** | System performs scheduled backup | System Timer (Neon) | Create point-in-time snapshot, store in backup storage | Scheduled time reached | Database backup created and stored, retention policy applied |
| **Credit Refund** | User cancels batch/bulk job | Authenticated User | Calculate unconsumed credits, refund to user balance | Job in PENDING/PROCESSING status, not completed | Job cancelled, unused credits refunded, job status set to CANCELLED |
| **Export Gallery** | User exports multiple generations | Authenticated User | Collect selected generation files, create ZIP archive | User has saved generations selected | ZIP file generated with all SVG/PNG files, download initiated |

### 3.6.2 Use Case Diagram

![Use Case Diagram - Handwriting Synthesis](https://via.placeholder.com/800x600.png?text=Use+Case+Diagram+-+Handwriting+Synthesis)

**Actors:**
- **User**: Individual using handwriting synthesis for personal projects
- **Team Owner**: Creates and manages team workspaces
- **Team Member**: Collaborates within team workspace with shared credits
- **Admin**: System administrator managing user accounts and credits

**Use Cases:**
- Register/Login (Google OAuth, Discord OAuth, credentials)
- Generate Handwriting (single, batch, bulk)
- Apply Realistic Effects (paper, ink, wear)
- Manage Gallery (save, search, tag, favorite, delete)
- Purchase Credits (Razorpay packages)
- Create/Manage Teams (invite, roles, shared credits)
- Recognize Handwriting (OCR with TrOCR)
- Create Templates (letters, notes, certificates)

### 3.6.3 Entity Relationship Diagram

![ER Diagram - Database Schema](https://via.placeholder.com/800x600.png?text=ER+Diagram+-+Database+Schema)

**Key Entities:**
- **User**: id, email, name, passwordHash, credits, image, createdAt
- **Account**: userId, provider (google/discord), providerAccountId
- **SavedGeneration**: id, userId, text, style, bias, svgContent, realisticPng, paperType, inkType, wearLevel, tags, isFavorite
- **Team**: id, name, slug, ownerId, credits, createdAt
- **TeamMember**: teamId, userId, role (OWNER/ADMIN/MEMBER)
- **TeamInvite**: id, teamId, email, role, token, expiresAt
- **Payment**: id, userId, orderId, paymentId, amount, credits, status
- **BatchJob**: id, userId, text, selectedStyles, status, totalItems
- **BulkJob**: id, userId, fileName, totalRows, processedRows, status
- **Template**: id, name, type, config, userId/teamId

**Relationships:**
- User 1:N SavedGeneration
- User 1:N Payment
- User 1:N BatchJob, BulkJob
- User N:M Team (through TeamMember)
- Team 1:N TeamInvite
- Team 1:N TeamGeneration

### 3.6.4 Class Diagram

![Class Diagram - System Architecture](https://via.placeholder.com/800x600.png?text=Class+Diagram+-+System+Architecture)

**Key Classes:**

*Frontend (Next.js):*
- **SynthesisPage**: Renders synthesis UI with text input, style selector, parameter controls
- **GalleryPage**: Displays saved generations with search, filters, pagination
- **TeamPage**: Manages team workspace, members, invitations
- **CreditPage**: Handles credit purchases via Razorpay

*API Layer (tRPC):*
- **AuthRouter**: signup, signin, signout, getSession procedures
- **SynthesisRouter**: generate, batch, realistic, saveToGallery procedures
- **GalleryRouter**: list, search, tag, favorite, delete procedures
- **TeamRouter**: create, invite, updateRole, listMembers procedures
- **CreditRouter**: purchase, consume, getBalance, listUsage procedures

*Backend (FastAPI):*
- **HandwritingModel**: LSTM RNN with MDN output, style embeddings, bias control
- **PostProcessor**: Applies paper/ink effects, wear simulation
- **OCREngine**: TrOCR model for handwriting recognition
- **SVGRenderer**: Converts strokes to SVG paths

*Database (Prisma):*
- **UserService**: CRUD operations for user accounts
- **GenerationService**: Save, retrieve, search generations
- **TeamService**: Team and member management
- **PaymentService**: Credit transactions and usage tracking

### 3.6.5 Activity Diagram - Handwriting Generation Flow

![Activity Diagram - Generation Flow](https://via.placeholder.com/800x600.png?text=Activity+Diagram+-+Generation+Flow)

**Flow:**
1. User enters text and selects style/bias
2. System validates input (character set, line limits)
3. tRPC sends request to FastAPI synthesis API
4. FastAPI loads LSTM model and style embedding
5. Model generates stroke sequences via MDN sampling
6. Strokes converted to SVG path
7. Optional: Apply realistic effects (paper/ink/wear)
8. Return SVG/PNG to frontend
9. User reviews preview
10. User saves to gallery → Prisma inserts record
11. Credits consumed → Usage logged

### 3.6.6 Sequence Diagram - Batch Generation

![Sequence Diagram - Batch Processing](https://via.placeholder.com/800x600.png?text=Sequence+Diagram+-+Batch+Processing)

**Participants:**
- User (Frontend)
- tRPC Server
- Inngest Worker
- FastAPI Synthesis API
- Database (Prisma)

**Sequence:**
1. User selects multiple styles for batch generation
2. Frontend → tRPC: batchGenerate(text, styles[])
3. tRPC creates BatchJob record in database
4. tRPC triggers Inngest event: synthesis/batch-generate
5. Inngest Worker fans out parallel jobs (one per style)
6. Each Worker → FastAPI: synthesize(text, style)
7. FastAPI returns SVG for each style
8. Worker updates BatchJobItem status → completed
9. All items complete → BatchJob status → completed
10. User receives notification → views results in gallery

### 3.6.7 State Diagram - Generation Status

![State Diagram - Generation Status](https://via.placeholder.com/800x600.png?text=State+Diagram+-+Generation+Status)

**States:**
- **Idle**: No generation in progress
- **Validating**: Checking input text, character set, line limits
- **Pending**: Queued for synthesis (batch/bulk jobs)
- **Processing**: LSTM inference in progress
- **Rendering**: Converting strokes to SVG/PNG
- **Applying Effects**: Post-processing with paper/ink/wear
- **Completed**: Successfully generated, saved to gallery
- **Failed**: Error occurred (validation, model, rendering)

**Transitions:**
- Idle → Validating (user clicks "Generate")
- Validating → Pending (batch/bulk queue)
- Validating → Processing (single generation)
- Processing → Rendering (strokes ready)
- Rendering → Applying Effects (user selected realistic mode)
- Rendering → Completed (no effects)
- Applying Effects → Completed (effects applied)
- Any → Failed (error at any stage)

### 3.6.8 Component Diagram - Monorepo Architecture

![Component Diagram - Monorepo](https://via.placeholder.com/800x600.png?text=Component+Diagram+-+Monorepo)

**Components:**

*apps/web (Next.js):*
- Pages: Synthesis, Gallery, Teams, Credits, Templates, OCR
- Components: UI primitives, forms, modals
- tRPC Client: Type-safe API calls
- NextAuth: Authentication provider

*apps/synthesis-api (Python FastAPI):*
- LSTM Model: Handwriting synthesis
- TrOCR Model: Handwriting recognition
- Post-Processing: Realistic effects
- API Routes: /synthesize, /realistic, /ocr

*apps/marketing (Vite):*
- Landing Pages: 10 brutalist designs
- React Router: Client-side navigation
- Spline: 3D components

*Database (PostgreSQL + Prisma):*
- Schema: 18+ models
- Migrations: Version control
- Connection Pool: Performance optimization

### 3.6.9 Deployment Diagram

![Deployment Diagram - Production Infrastructure](https://via.placeholder.com/800x600.png?text=Deployment+Diagram+-+Production)

**Infrastructure:**

*Client Devices:*
- Web Browsers (Chrome, Firefox, Safari, Edge)
- Mobile Browsers (iOS Safari, Chrome Mobile)

*Vercel (Frontend):*
- Next.js 15 App (Serverless Functions)
- Edge Functions (Global CDN)
- Static Assets (Images, Fonts)

*Python Hosting (Backend):*
- FastAPI Synthesis API (Docker containers)
- Horizontal scaling with load balancer
- GPU instances for model inference (optional)

*Neon (Database):*
- PostgreSQL with automatic scaling
- Connection pooling
- Backup and point-in-time recovery

*UploadThing (Storage):*
- CDN-delivered SVG/PNG files
- Automatic image optimization

*Inngest (Jobs):*
- Background job workers
- Retry logic and monitoring
- Cron scheduler

*Razorpay (Payments):*
- Payment gateway API
- Webhook handlers for order/payment events

---

These diagrams provide a comprehensive visual representation of the Handwriting Synthesis platform's architecture, workflows, and data relationships, facilitating understanding for developers, stakeholders, and users.
