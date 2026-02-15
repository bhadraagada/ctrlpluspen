# 3 Requirement and Analysis (Ref Project)

## 3.1 Problem Definition

### 3.1.1 Problem Analysis

The goal is to build a system that converts **input text** into **human-like handwriting** by generating a continuous sequence of pen strokes. The key challenges are:

- **Sequence generation:** handwriting is a long, variable-length time series with dependencies across timesteps.
- **Continuous outputs:** pen motion is continuous (x/y) plus a discrete pen-up/pen-down state.
- **Alignment:** text characters must be aligned to stroke segments (often unknown a priori), requiring attention-like mechanisms.
- **Style variability:** handwriting style differs per writer and even within the same writer; controlling style and “neatness” matters.
- **Rendering:** generated offsets must be converted into readable SVG/graphics.

In this `ref/` implementation, these challenges are addressed with:

- **RNN-based model** with LSTM layers and an attention window over characters.
- **Mixture Density Network (MDN / GMM head)** to model continuous coordinates.
- **Style priming** via pre-saved style samples (`styles/style-*-strokes.npy`, `styles/style-*-chars.npy`).
- **Bias parameter** to control output neatness/diversity.

### 3.1.2 Existing Problem

Traditional approaches (fonts / rule-based stroke synthesis) often produce:

- Unnatural strokes and spacing,
- Lack of personalization,
- Limited variability and poor realism.

### 3.1.3 Proposed System

The proposed system is a stroke-based handwriting generator:

1. **Input:** text lines (ASCII) + optional (style, bias)
2. **Encoding:** convert text to integer IDs (`drawing.encode_ascii`)
3. **Generation:** RNN + attention + MDN predicts stroke offsets and pen state
4. **Post-process:** denoise + align + convert offsets → coordinates
5. **Render:** export SVG via `svgwrite`

---

## 3.2 Requirement Specification

### Functional Requirements

- **FR1:** Accept one or more text lines as input (max length constraint enforced in `demo.py`).
- **FR2:** Generate stroke sequences $(\Delta x, \Delta y, eos)$ for each line.
- **FR3:** Support **bias** as a controllable parameter affecting neatness/diversity.
- **FR4:** Support **style priming** using a small set of reference strokes/characters.
- **FR5:** Render generated handwriting into **SVG** output.
- **FR6:** Allow training from processed dataset arrays (`data/processed/*.npy`).
- **FR7:** Save and restore model checkpoints.
- **FR8:** Record training logs.

### Non-Functional Requirements

- **NFR1 (Performance):** Training/inference should run on CPU; GPU is optional.
- **NFR2 (Reproducibility):** Config and checkpoints allow runs to be reproduced.
- **NFR3 (Usability):** Provide simple scripts for training and demo generation.
- **NFR4 (Maintainability):** Modular separation of data, model, and rendering utilities.

---

## 3.3 Planning and Scheduling

An implementation-ready schedule aligned to the production monorepo workflow:

1. **Core setup (Weeks 1-2)**
- Initialize Turborepo apps and shared configs.
- Configure auth, base schema, and synthesis UI shell.

2. **Synthesis API integration (Weeks 3-4)**
- Integrate FastAPI synthesis/realistic/ocr routes.
- Add style, bias, and preview pipeline.

3. **Gallery and credits (Weeks 5-6)**
- Implement saved generations, search, tags, favorites.
- Add payment flow and credit consumption tracking.

4. **Batch/Bulk and teams (Weeks 7-8)**
- Add Inngest batch/bulk orchestration.
- Implement team workspace, invitations, and roles.

5. **Hardening and release (Weeks 9-10)**
- Add test coverage, performance checks, and deployment tuning.

### 3.3.1 PERT Chart

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

left to right direction

rectangle "A\nMonorepo Setup\n(5d)" as A
rectangle "B\nAuth + Prisma Base\n(5d)" as B
rectangle "C\nSynthesis API Wiring\n(6d)" as C
rectangle "D\nWeb Synthesis UI\n(4d)" as D
rectangle "E\nGallery + Credits\n(6d)" as E
rectangle "F\nBatch/Bulk (Inngest)\n(5d)" as F
rectangle "G\nTeams + Roles\n(4d)" as G
rectangle "H\nTesting + Perf + Deploy\n(5d)" as H

A --> B
A --> C
B --> D
C --> D
D --> E
E --> F
E --> G
F --> H
G --> H
@enduml
```

### 3.3.2 Gantt Chart

```plantuml
@startgantt
Project starts 2026-02-16
printscale weekly
saturday are closed
sunday are closed

[Phase 1: Core setup] lasts 10 days
[Monorepo setup] lasts 5 days
[Auth + Prisma base] lasts 5 days
[Auth + Prisma base] starts at [Monorepo setup]'s end

[Phase 2: Synthesis integration] lasts 10 days
[Synthesis API wiring] lasts 6 days
[Web synthesis UI] lasts 4 days
[Synthesis API wiring] starts at [Phase 1: Core setup]'s end
[Web synthesis UI] starts at [Synthesis API wiring]'s end

[Phase 3: Gallery + credits] lasts 10 days
[Gallery + credits] lasts 6 days
[Gallery + credits] starts at [Phase 2: Synthesis integration]'s end

[Phase 4: Batch/Bulk + teams] lasts 10 days
[Batch/Bulk (Inngest)] lasts 5 days
[Teams + roles] lasts 4 days
[Batch/Bulk (Inngest)] starts at [Gallery + credits]'s end
[Teams + roles] starts at [Gallery + credits]'s end

[Phase 5: Hardening + release] lasts 10 days
[Testing + perf + deploy] lasts 5 days
[Testing + perf + deploy] starts at [Batch/Bulk (Inngest)]'s end
@endgantt
```

---

## 3.4 Software and Hardware Requirements

### Software Requirements

- **Operating System:** Windows / Linux
- **Python:** 3.x (commonly used with TF 1.x codebases)
- **Core Libraries:**
  - TensorFlow 1.x compatible runtime
  - NumPy
  - svgwrite
  - Matplotlib (for visualization)

### Hardware Requirements

- **Minimum:** CPU-only machine, 8GB RAM (more recommended for training)
- **Recommended:** NVIDIA GPU + CUDA-compatible setup for faster training
- **Storage:** enough for datasets + checkpoints + logs (hundreds of MB to GB depending on dataset)

---

## 3.5 Preliminary Product Description

The system provides two main capabilities:

- **Training:** learns a handwriting synthesis model from stroke/text sequences and saves checkpoints.
- **Generation:** synthesizes handwriting from new text, with:
  - **Priming** (style imitation via reference samples)
  - **Bias control** (neatness vs diversity)
  - **SVG export** for downstream use

The output is a set of SVG files containing realistic stroke paths suitable for preview, printing, or embedding in documents.

---

# 3.6 Conceptual Diagrams (Monorepo)

The following diagrams describe the same system visually.

---

## 3.6.1 Event Table

| Event ID | Trigger / Event          | Input                     | Processing (High-level)                                  | Output                 |
| -------- | ------------------------ | ------------------------- | -------------------------------------------------------- | ---------------------- |
| E1       | Generate synthetic data  | `--num_samples`           | `synthesize_training_data.py` creates stroke/text arrays | `data/processed/*.npy` |
| E2       | Prepare/validate dataset | raw strokes + ascii       | `prepare_data.py` normalizes/splits/serializes           | processed `.npy`       |
| E3       | Train model              | processed `.npy`          | `train_model.py` → `rnn.fit()` training loop             | checkpoints + logs     |
| E4       | Generate handwriting     | text lines (+ style/bias) | `demo.py` samples `nn.sampled_sequence`                  | stroke sequences       |
| E5       | Render/export            | strokes                   | `drawing.py` + `svgwrite` renders strokes                | `.svg` images          |

---

## 3.6.2 Use Case Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

actor "User" as User
actor "Team Owner" as Owner
actor "Team Member" as Member
actor "Admin" as Admin
actor "Payment Gateway" as PG

rectangle "Handwriting Platform (Monorepo)" {
  usecase "Authenticate (OAuth/Credentials)" as UC1
  usecase "Generate Handwriting" as UC2
  usecase "Apply Realistic Effects" as UC3
  usecase "Save / Search Gallery" as UC4
  usecase "Batch / Bulk Processing" as UC5
  usecase "Manage Team Workspace" as UC6
  usecase "Purchase Credits" as UC7
  usecase "Run OCR Recognition" as UC8
}

User --> UC1
User --> UC2
User --> UC3
User --> UC4
User --> UC5
User --> UC7
User --> UC8
Owner --> UC6
Member --> UC4
Member --> UC5
Admin --> UC6
PG --> UC7

UC3 .> UC2 : <<extend>>
UC5 .> UC2 : <<extend>>
UC4 .> UC2 : <<include>>
@enduml
```

---

## 3.6.3 Entity Relationship Diagram (ERD)

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

entity "User" as User {
  * id
  --
  email
  name
  credits
}

entity "SavedGeneration" as Gen {
  * id
  --
  user_id
  text
  style
  bias
  svg_url
  png_url
}

entity "Team" as Team {
  * id
  --
  owner_id
  name
  slug
  credits
}

entity "TeamMember" as TeamMember {
  * team_id
  * user_id
  --
  role
}

entity "TeamInvite" as Invite {
  * id
  --
  team_id
  email
  role
  token
}

entity "Payment" as Payment {
  * id
  --
  user_id
  order_id
  amount
  credits_added
  status
}

entity "BatchJob" as Batch {
  * id
  --
  user_id
  status
  total_items
}

entity "BulkJob" as Bulk {
  * id
  --
  user_id
  status
  total_rows
}

User ||--o{ Gen : creates
User ||--o{ Payment : makes
User ||--o{ Batch : runs
User ||--o{ Bulk : runs
User ||--o{ Team : owns
Team ||--o{ TeamMember : has
User ||--o{ TeamMember : joins
Team ||--o{ Invite : sends
@enduml
```

---

## 3.6.4 Class Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false
skinparam classAttributeIconSize 0

class WebApp {
  + renderSynthesisPage()
  + renderGalleryPage()
  + callTrpc()
}

class TRPCRouter {
  + generate()
  + saveToGallery()
  + batchGenerate()
  + purchaseCredits()
}

class SynthesisAPI {
  + synthesize()
  + realistic()
  + ocr()
}

class HandwritingModel {
  + loadStyle()
  + sampleStrokes()
}

class PostProcessor {
  + applyPaper()
  + applyInk()
  + applyWear()
}

class OCRService {
  + recognize()
}

class PrismaService {
  + createGeneration()
  + createBatchJob()
  + updateCredits()
}

class InngestWorker {
  + processBatch()
  + processBulk()
}

class RazorpayService {
  + createOrder()
  + verifyPayment()
}

WebApp --> TRPCRouter
TRPCRouter --> PrismaService
TRPCRouter --> SynthesisAPI
TRPCRouter --> InngestWorker
TRPCRouter --> RazorpayService
SynthesisAPI --> HandwritingModel
SynthesisAPI --> PostProcessor
SynthesisAPI --> OCRService
@enduml
```

---

## 3.6.5 Object Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

object ":WebApp" as web
object ":SynthesisRouter" as router
object ":FastAPIService" as api
object ":HandwritingModel" as model {
  style = 7
  bias = 0.8
}
object ":PrismaClient" as prisma
object ":InngestWorker" as inngest
object ":RazorpayClient" as rzpay
object "GenerationRequest" as req {
  text = "Hello World"
  style = 7
  bias = 0.8
}

web --> router
router --> api
router --> prisma
router --> inngest
router --> rzpay
api --> model
router ..> req
@enduml
```

---

## 3.6.6 Activity Diagrams

### 3.6.6.1 Generation Activity

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

start
:User enters text + style + bias;
:Validate text and credits;
if (valid request?) then (yes)
  :Call tRPC generate();
  :Call FastAPI /synthesize;
  :Run LSTM+MDN sampling;
  :Build SVG response;
  if (realistic mode?) then (yes)
    :Call /realistic;
    :Apply paper/ink/wear effects;
  endif
  :Save result to gallery;
  :Deduct credits and log usage;
else (no)
  :Return validation error;
endif
stop
@enduml
```

### 3.6.6.2 Batch/Bulk Activity

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

start
:User starts batch or bulk job;
:Create BatchJob/BulkJob record;
:Publish Inngest event;

repeat
  :Worker picks next item;
  :Call synthesis API;
  :Persist SVG/PNG output;
  :Update item status;
repeat while (items remaining?)

:Finalize job status;
:Notify user in UI;
stop
@enduml
```

---

## 3.6.7 Sequence Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

actor "User / Developer" as Actor
participant "apps/web (Next.js)" as Web
participant "tRPC Router" as Trpc
participant "apps/synthesis-api (FastAPI)" as Api
participant "Inngest Worker" as Worker
participant "Prisma + PostgreSQL" as DB
participant "UploadThing CDN" as CDN

alt Single Generation
    Actor -> Web : Submit text/style/bias
    Web -> Trpc : synthesis.generate()
    Trpc -> Api : POST /synthesize
    Api --> Trpc : SVG (or SVG+PNG)
    Trpc -> DB : Save generation + consume credits
    Trpc -> CDN : Upload artifacts
    Trpc --> Web : Result + metadata
else Batch / Bulk
    Actor -> Web : Start batch/bulk
    Web -> Trpc : synthesis.batch()/bulk()
    Trpc -> DB : Create job record
    Trpc -> Worker : Dispatch event
    loop per item
      Worker -> Api : POST /synthesize
      Api --> Worker : SVG/PNG
      Worker -> DB : Update item status
      Worker -> CDN : Upload item output
    end
    Worker -> DB : Mark job completed
    Web <- Trpc : Poll/read job status
end
@enduml
```

---

## 3.6.8 State-Flow Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

state "Training Flow" as TrainingFlow {
  [*] --> Idle
  Idle --> Validating : request submitted
  Validating --> Processing : input + credits valid
  Validating --> Failed : validation error
  Processing --> Rendering : strokes generated
  Rendering --> ApplyingEffects : realistic mode on
  Rendering --> Persisting : realistic mode off
  ApplyingEffects --> Persisting
  Persisting --> Completed : saved + credits consumed
  Processing --> Failed : synthesis error
  ApplyingEffects --> Failed : rendering error
}

state "Inference Flow" as InferenceFlow {
  [*] --> Queued
  Queued --> Running : worker picked item
  Running --> Retrying : transient failure
  Retrying --> Running
  Running --> ItemCompleted : item done
  ItemCompleted --> Running : next item
  ItemCompleted --> JobCompleted : all items done
  Running --> JobFailed : permanent failure threshold
}

Completed --> [*]
Failed --> [*]
JobCompleted --> [*]
JobFailed --> [*]
@enduml
```

---

## 3.6.9 Context Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

rectangle "User" as User
rectangle "Monorepo Platform\n(apps/web + apps/synthesis-api + apps/marketing)" as Sys
rectangle "Neon PostgreSQL" as DB
rectangle "UploadThing CDN" as Storage
rectangle "Inngest Jobs" as Jobs
rectangle "Razorpay" as Pay
rectangle "OAuth Providers\n(Google / Discord)" as OAuth
rectangle "Compute Runtime\n(Vercel + Python host)" as Runtime

User --> Sys : generate, save, batch, OCR
Sys --> DB : users, teams, jobs, credits
Sys --> Storage : SVG/PNG assets
Sys --> Jobs : batch/bulk events
Sys --> Pay : orders + payment verification
Sys --> OAuth : sign-in flow
Sys --> Runtime : execute APIs/workers
Sys --> User : previews, gallery, exports
@enduml
```

---

## 3.6.10 Data-Flow Diagram (DFD)

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

rectangle "Text Input\n(Frontend UI)" as Input
rectangle "Validation + Auth\n(tRPC + NextAuth)" as Validate
rectangle "Synthesis API\n(FastAPI LSTM/MDN)" as Synthesize
rectangle "Realistic Processing\n(OpenCV/Pillow/CairoSVG)" as Effects
rectangle "Persistence\n(Prisma + PostgreSQL)" as Persist
rectangle "Storage\n(UploadThing)" as Store
rectangle "Async Jobs\n(Inngest)" as Async
rectangle "Client Output\n(SVG/PNG/PDF/JSON)" as Output

Input --> Validate
Validate --> Synthesize
Synthesize --> Effects
Effects --> Persist
Persist --> Store
Store --> Output
Validate --> Async
Async --> Synthesize
Async --> Persist
@enduml
```

---

## 3.6.11 Component Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

component "Frontend App" as C1 {
  [apps/web]
  [tRPC + NextAuth]
}

component "Synthesis Service" as C2 {
  [apps/synthesis-api]
  [FastAPI routes]
  [LSTM + TrOCR + rendering]
}

component "Marketing App" as C3 {
  [apps/marketing]
  [Vite + React Router]
}

component "Shared Packages" as C4 {
  [packages/shared-config]
  [eslint + tsconfig]
}

component "Integrations & Jobs" as C5 {
  [Inngest Workers]
  [Razorpay Integration]
  [UploadThing Integration]
}

database "Filesystem" as FS {
  folder "PostgreSQL (Neon)"
  folder "CDN Object Storage"
}

C1 --> FS
C2 --> FS
C5 --> FS
C1 --> C2
C1 --> C4
C2 --> C4
C1 --> C5
@enduml
```

---

## 3.6.12 Package Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

package "monorepo" as mono {
  package "apps" as apps {
    [web]
    [synthesis-api]
    [marketing]
  }

  package "packages" as pkgs {
    [shared-config]
  }

  package "infra" as infra {
    [PostgreSQL/Prisma]
    [Inngest]
    [UploadThing]
    [Razorpay]
  }
}

"web" ..> "synthesis-api" : synthesis/ocr/realistic calls
"web" ..> "PostgreSQL/Prisma" : reads/writes app data
"web" ..> "Inngest" : dispatch batch/bulk jobs
"synthesis-api" ..> "UploadThing" : stores generated files
"web" ..> "Razorpay" : payment workflows
apps ..> [shared-config] : lint/build config
@enduml
```

---

## 3.6.13 Deployment Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

node "Local PC (Windows)" as PC {
 node "Client Devices" as Client {
    artifact "Web Browser" as Browser
  }

  node "Vercel" as Vercel {
    artifact "apps/web (Next.js)" as Web
    artifact "apps/marketing (Vite static)" as Mkt
  }

  node "Python Host" as PyHost {
    artifact "apps/synthesis-api (FastAPI)" as Api
    node "CPU/GPU Runtime" as Compute
  }

  database "Neon PostgreSQL" as DB
  cloud "UploadThing CDN" as CDN
  queue "Inngest" as Inngest
  cloud "Razorpay" as Razorpay
  cloud "OAuth Providers" as OAuth
}

Browser --> Web
Browser --> Mkt
Web --> Api
Web --> DB
Web --> Inngest
Web --> Razorpay
Web --> OAuth
Api --> CDN
Api --> Compute
Inngest --> Api
@enduml
```

