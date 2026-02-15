# Module 4: System Coding

## 4.1 Code

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model with authentication and credits
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?
  credits       Int       @default(10)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts          Account[]
  sessions          Session[]
  savedGenerations  SavedGeneration[]
  batchJobs         BatchJob[]
  bulkJobs          BulkJob[]
  payments          Payment[]
  usage             Usage[]
  synthesisUsage    SynthesisUsage[]
  teamMemberships   TeamMember[]
  ownedTeams        Team[]              @relation("TeamOwner")
  templates         Template[]          @relation("UserTemplates")
}

// SavedGeneration model for gallery management
model SavedGeneration {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  status          GenerationStatus @default(COMPLETED)
  text            String           @db.Text
  style           Int
  bias            Float
  strokeColor     String           @default("black")
  strokeWidth     Int              @default(2)

  svgContent      String?          @db.Text
  uploadUrl       String?
  uploadKey       String?

  realisticPng    String?          @db.Text
  paperType       String?
  inkType         String?
  wearLevel       Float?

  linesCount      Int?
  charactersCount Int?
  processingTime  Float?

  isFavorite      Boolean          @default(false)
  tags            String[]         @default([])

  teamId          String?
  team            Team?            @relation("TeamGenerations", fields: [teamId], references: [id], onDelete: SetNull)

  batchJobId      String?
  batchJob        BatchJob?        @relation(fields: [batchJobId], references: [id])

  bulkJobItemId   String?          @unique
  bulkJobItem     BulkJobItem?     @relation(fields: [bulkJobItemId], references: [id])

  createdAt       DateTime         @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@index([teamId, createdAt(sort: Desc)])
  @@index([status])
}

// Team model for collaboration
model Team {
  id              String        @id @default(cuid())
  name            String
  slug            String        @unique
  description     String?
  credits         Int           @default(0)

  ownerId         String
  owner           User          @relation("TeamOwner", fields: [ownerId], references: [id], onDelete: Cascade)

  members         TeamMember[]
  invites         TeamInvite[]
  generations     SavedGeneration[] @relation("TeamGenerations")
  templates       Template[]    @relation("TeamTemplates")

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([ownerId])
  @@index([slug])
}

// TeamMember model for role-based access
model TeamMember {
  id        String     @id @default(cuid())
  teamId    String
  team      Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      TeamRole   @default(MEMBER)
  joinedAt  DateTime   @default(now())

  @@unique([teamId, userId])
  @@index([userId])
  @@index([teamId])
}

// Payment model for credit purchases
model Payment {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  orderId         String        @unique
  paymentId       String?       @unique
  amount          Int
  currency        String        @default("INR")
  credits         Int
  status          PaymentStatus @default(PENDING)

  razorpaySignature String?
  errorMessage    String?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([userId])
  @@index([status])
}

// BatchJob model for parallel style generation
model BatchJob {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  text            String      @db.Text
  selectedStyles  Int[]
  totalItems      Int
  status          BatchStatus @default(PENDING)

  items           SavedGeneration[]

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId, status])
}

// BulkJob model for CSV processing
model BulkJob {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  fileName        String
  totalRows       Int
  processedRows   Int         @default(0)
  successRows     Int         @default(0)
  failedRows      Int         @default(0)
  status          BulkStatus  @default(PENDING)

  items           BulkJobItem[]

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId, status])
}

model BulkJobItem {
  id              String           @id @default(cuid())
  bulkJobId       String
  bulkJob         BulkJob          @relation(fields: [bulkJobId], references: [id], onDelete: Cascade)

  rowNumber       Int
  text            String           @db.Text
  style           Int
  bias            Float
  status          GenerationStatus @default(PENDING)
  errorMessage    String?

  generation      SavedGeneration?

  createdAt       DateTime         @default(now())

  @@index([bulkJobId])
}

enum GenerationStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum BatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum BulkStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}
```

### src/server/api/routers/synthesis.ts

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const SYNTHESIS_API_URL = process.env.SYNTHESIS_API_URL ?? "http://localhost:8001";

export const synthesisRouter = createTRPCRouter({
  // Generate handwriting
  generate: protectedProcedure
    .input(z.object({
      text: z.string().min(1).max(1500),
      style: z.number().min(0).max(12).default(9),
      bias: z.number().min(0).max(1.5).default(0.75),
      strokeColor: z.string().default("black"),
      strokeWidth: z.number().min(1).max(5).default(2),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check credits
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { credits: true },
      });

      if (!user || user.credits < 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits",
        });
      }

      // Call synthesis API
      const response = await fetch(`${SYNTHESIS_API_URL}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          style: input.style,
          bias: input.bias,
          stroke_color: input.strokeColor,
          stroke_width: input.strokeWidth,
        }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Synthesis failed",
        });
      }

      const data = await response.json();

      // Deduct credit and log usage
      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { credits: { decrement: 1 } },
        }),
        ctx.db.synthesisUsage.create({
          data: {
            userId: ctx.session.user.id,
            creditsUsed: 1,
            linesCount: data.lines_count,
            charactersCount: data.characters_count,
            style: input.style,
            bias: input.bias,
            success: true,
          },
        }),
      ]);

      return {
        svg: data.svg_raw,
        linesCount: data.lines_count,
        charactersCount: data.characters_count,
      };
    }),

  // Apply realistic effects
  makeRealistic: protectedProcedure
    .input(z.object({
      generationId: z.string(),
      paperType: z.enum(["white", "cream", "aged", "lined", "grid", "recycled"]).default("white"),
      inkType: z.enum(["ballpoint", "gel", "fountain", "marker", "pencil"]).default("ballpoint"),
      wearLevel: z.number().min(0).max(1).default(0.3),
    }))
    .mutation(async ({ ctx, input }) => {
      const generation = await ctx.db.savedGeneration.findFirst({
        where: { id: input.generationId, userId: ctx.session.user.id },
      });

      if (!generation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Check credits
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { credits: true },
      });

      if (!user || user.credits < 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits for realistic rendering",
        });
      }

      const response = await fetch(`${SYNTHESIS_API_URL}/process/realistic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          svg_content: generation.svgContent,
          paper_type: input.paperType,
          ink_type: input.inkType,
          wear_level: input.wearLevel,
        }),
      });

      const data = await response.json();

      // Update generation and deduct credit
      return await ctx.db.$transaction([
        ctx.db.savedGeneration.update({
          where: { id: input.generationId },
          data: {
            realisticPng: data.realistic_png,
            paperType: data.paper_type,
            inkType: data.ink_type,
            wearLevel: data.wear_level,
          },
        }),
        ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { credits: { decrement: 1 } },
        }),
      ]);
    }),
});
```

### apps/synthesis-api/main.py

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import tempfile
import os

app = FastAPI(title="Handwriting Synthesis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_CHARS = set([
    " ", "!", '"', "#", "'", "(", ")", ",", "-", ".",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ":", ";", "?",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "R", "S", "T", "U", "V", "W", "Y",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
])

MAX_CHARS_PER_LINE = 75
MAX_LINES = 20

# Lazy load model
_hand_instance = None

def get_hand():
    global _hand_instance
    if _hand_instance is None:
        from handwriting_synthesis import Hand
        _hand_instance = Hand()
    return _hand_instance


class SynthesisRequest(BaseModel):
    text: str = Field(..., description="Text to convert")
    style: int = Field(default=9, ge=0, le=12)
    bias: float = Field(default=0.75, ge=0.0, le=1.5)
    stroke_color: str = Field(default="black")
    stroke_width: int = Field(default=2, ge=1, le=5)

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Text cannot be empty")

        lines = v.split("\n")
        if len(lines) > MAX_LINES:
            raise ValueError(f"Maximum {MAX_LINES} lines allowed")

        for i, line in enumerate(lines):
            if len(line) > MAX_CHARS_PER_LINE:
                raise ValueError(f"Line {i+1} exceeds {MAX_CHARS_PER_LINE} chars")

            invalid = [c for c in line if c not in VALID_CHARS]
            if invalid:
                raise ValueError(f"Invalid characters: {invalid}")

        return v


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": _hand_instance is not None,
        "max_chars_per_line": MAX_CHARS_PER_LINE,
        "max_lines": MAX_LINES,
    }


@app.post("/synthesize")
async def synthesize_handwriting(request: SynthesisRequest):
    try:
        hand = get_hand()
        lines = request.text.split("\n")

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            hand.write(
                filename=tmp_path,
                lines=lines,
                biases=[request.bias] * len(lines),
                styles=[request.style] * len(lines),
                stroke_colors=[request.stroke_color] * len(lines),
                stroke_widths=[request.stroke_width] * len(lines),
            )

            with open(tmp_path, "r") as f:
                svg_content = f.read()
        finally:
            os.unlink(tmp_path)

        return {
            "svg_raw": svg_content,
            "lines_count": len(lines),
            "characters_count": sum(len(line) for line in lines),
            "style": request.style,
            "bias": request.bias,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### apps/synthesis-api/post_processing.py

```python
import numpy as np
import cv2
from PIL import Image
import cairosvg
import io
import base64
from enum import Enum


class PaperType(str, Enum):
    WHITE = "white"
    CREAM = "cream"
    AGED = "aged"
    LINED = "lined"
    GRID = "grid"
    RECYCLED = "recycled"


class InkType(str, Enum):
    BALLPOINT = "ballpoint"
    GEL = "gel"
    FOUNTAIN = "fountain"
    MARKER = "marker"
    PENCIL = "pencil"


def generate_perlin_noise(width, height, scale=50.0, octaves=4):
    """Generate paper texture noise"""
    noise = np.zeros((height, width), dtype=np.float32)

    for octave in range(octaves):
        freq = 2 ** octave
        amplitude = 1 / freq

        grid_h = max(2, int(height / (scale / freq)))
        grid_w = max(2, int(width / (scale / freq)))

        grid = np.random.rand(grid_h, grid_w).astype(np.float32)
        resized = cv2.resize(grid, (width, height), interpolation=cv2.INTER_CUBIC)
        noise += resized * amplitude

    return (noise - noise.min()) / (noise.max() - noise.min())


def generate_paper_texture(width, height, paper_type):
    """Create paper background with texture"""
    colors = {
        PaperType.WHITE: (252, 252, 250),
        PaperType.CREAM: (255, 253, 240),
        PaperType.AGED: (245, 235, 210),
        PaperType.RECYCLED: (240, 238, 230),
    }

    base_color = colors.get(paper_type, (252, 252, 250))
    img = np.full((height, width, 3), base_color, dtype=np.float32)

    # Add texture
    noise = generate_perlin_noise(width, height, scale=20.0, octaves=3)
    noise = (noise - 0.5) * 8  # Subtle variation

    for c in range(3):
        img[:, :, c] += noise

    return np.clip(img, 0, 255).astype(np.uint8)


def svg_to_alpha_mask(svg_content):
    """Convert SVG to grayscale mask"""
    png_data = cairosvg.svg2png(bytestring=svg_content.encode("utf-8"))
    img = Image.open(io.BytesIO(png_data)).convert("RGBA")

    rgb = np.array(img.convert("RGB"), dtype=np.float32)
    luminance = 0.299 * rgb[:,:,0] + 0.587 * rgb[:,:,1] + 0.114 * rgb[:,:,2]
    darkness = 255 - luminance

    alpha = np.array(img.split()[3], dtype=np.float32)
    mask = (darkness * alpha / 255).astype(np.uint8)

    return mask, img.size[0], img.size[1]


def apply_edge_roughness(mask, intensity=0.25):
    """Add micro-perturbations to edges"""
    if intensity <= 0:
        return mask

    height, width = mask.shape
    dx = generate_perlin_noise(width, height, scale=20) - 0.5
    dy = generate_perlin_noise(width, height, scale=20) - 0.5

    dx *= intensity * 2
    dy *= intensity * 2

    y, x = np.meshgrid(np.arange(height), np.arange(width), indexing="ij")
    new_x = np.clip(x + dx, 0, width - 1).astype(np.float32)
    new_y = np.clip(y + dy, 0, height - 1).astype(np.float32)

    return cv2.remap(mask.astype(np.float32), new_x, new_y,
                     interpolation=cv2.INTER_LINEAR).astype(np.uint8)


def composite_ink_on_paper(ink_mask, paper, ink_color=(20, 20, 40)):
    """Blend ink onto paper"""
    height, width = ink_mask.shape
    ink_alpha = ink_mask.astype(np.float32) / 255

    result = paper.astype(np.float32)

    for c in range(3):
        result[:,:,c] = (
            result[:,:,c] * (1 - ink_alpha * 0.9) +
            ink_color[c] * ink_alpha * 0.9
        )

    return np.clip(result, 0, 255).astype(np.uint8)


def process_realistic_base64(svg_content, paper_type="white",
                              ink_type="ballpoint", wear_level=0.3):
    """Main processing function - returns base64 PNG"""

    # Convert SVG to mask
    mask, width, height = svg_to_alpha_mask(svg_content)

    # Generate paper
    paper = generate_paper_texture(width, height, PaperType(paper_type))

    # Apply effects
    mask = apply_edge_roughness(mask, intensity=0.25)

    # Composite
    result = composite_ink_on_paper(mask, paper)

    # Add subtle noise
    noise = np.random.randn(*result.shape) * (wear_level * 3)
    result = np.clip(result + noise, 0, 255).astype(np.uint8)

    # Convert to base64
    img = Image.fromarray(result)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    png_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "realistic_png": png_base64,
        "width": width,
        "height": height,
        "paper_type": paper_type,
        "ink_type": ink_type,
        "wear_level": wear_level,
    }
```

### src/server/auth.ts

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "~/server/db";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

### src/inngest/functions.ts

```typescript
import { inngest } from "./client";
import { db } from "~/server/db";

const SYNTHESIS_API_URL = process.env.SYNTHESIS_API_URL ?? "http://localhost:8001";

export const processBatchSynthesis = inngest.createFunction(
  {
    id: "process-batch-synthesis",
    retries: 3,
    concurrency: { limit: 2, key: "event.data.userId" },
  },
  { event: "synthesis/batch.requested" },
  async ({ event, step }) => {
    const { batchJobId, userId, text, selectedStyles } = event.data;

    // Update status to PROCESSING
    await step.run("update-status", async () => {
      await db.batchJob.update({
        where: { id: batchJobId },
        data: { status: "PROCESSING" },
      });
    });

    let successCount = 0;

    // Process each style variant
    for (let i = 0; i < selectedStyles.length; i++) {
      const style = selectedStyles[i];

      const result = await step.run(`generate-style-${style}`, async () => {
        const response = await fetch(`${SYNTHESIS_API_URL}/synthesize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            style,
            bias: 0.75,
            stroke_color: "black",
            stroke_width: 2,
          }),
        });

        if (!response.ok) {
          return { success: false, error: await response.text() };
        }

        const data = await response.json();
        return { success: true, svgContent: data.svg_raw };
      });

      // Save result
      await step.run(`save-style-${style}`, async () => {
        await db.savedGeneration.create({
          data: {
            userId,
            batchJobId,
            text,
            style,
            bias: 0.75,
            strokeColor: "black",
            strokeWidth: 2,
            status: result.success ? "COMPLETED" : "FAILED",
            svgContent: result.success ? result.svgContent : null,
          },
        });

        if (result.success) {
          successCount++;
          await db.user.update({
            where: { id: userId },
            data: { credits: { decrement: 1 } },
          });
        }
      });
    }

    // Finalize
    await step.run("finalize", async () => {
      await db.batchJob.update({
        where: { id: batchJobId },
        data: {
          status: successCount > 0 ? "COMPLETED" : "FAILED",
        },
      });
    });

    return { batchJobId, successCount, total: selectedStyles.length };
  }
);
```

---

## 4.2 Data Dictionary

### User

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique user identifier (primary key) | String (cuid) |
| email | User's email address (unique) | String? |
| name | Full name of the user | String? |
| password | Bcrypt hashed password (for credentials auth) | String? |
| image | User avatar URL | String? |
| credits | Available credits for synthesis operations | Int (@default(10)) |
| emailVerified | Email verification timestamp | DateTime? |
| createdAt | Account creation timestamp | DateTime (@default(now())) |
| updatedAt | Last modification timestamp | DateTime (@updatedAt) |

### SavedGeneration

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique generation identifier (primary key) | String (cuid) |
| userId | Reference to user who created generation | String (FK) |
| teamId | Reference to team (if team generation) | String? (FK) |
| status | Generation status (PENDING, PROCESSING, COMPLETED, FAILED) | GenerationStatus (enum) |
| text | Input text content | String (@db.Text) |
| style | Handwriting style index (0-12) | Int |
| bias | Neatness/randomness parameter (0.0-1.5) | Float |
| strokeColor | CSS color value for strokes | String (@default("black")) |
| strokeWidth | Stroke width in pixels (1-5) | Int (@default(2)) |
| svgContent | Generated SVG markup | String? (@db.Text) |
| uploadUrl | UploadThing CDN URL | String? |
| uploadKey | UploadThing file key (unique) | String? |
| realisticPng | Base64 encoded realistic PNG | String? (@db.Text) |
| paperType | Paper type identifier (white, cream, aged, etc.) | String? |
| inkType | Ink type identifier (ballpoint, gel, etc.) | String? |
| wearLevel | Degradation intensity (0.0-1.0) | Float? |
| linesCount | Number of lines in text | Int? |
| charactersCount | Total character count | Int? |
| processingTime | Time taken for synthesis (seconds) | Float? |
| isFavorite | Favorite flag for quick access | Boolean (@default(false)) |
| tags | Array of custom tag strings | String[] (@default([])) |
| batchJobId | Reference to batch job (if part of batch) | String? (FK) |
| bulkJobItemId | Reference to bulk job item (if part of bulk) | String? (FK) |
| createdAt | Generation creation timestamp | DateTime (@default(now())) |

### Team

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique team identifier (primary key) | String (cuid) |
| name | Team display name | String |
| slug | Unique URL-friendly team identifier | String (@unique) |
| description | Team description (optional) | String? |
| credits | Shared team credit pool | Int (@default(0)) |
| ownerId | Reference to team owner user | String (FK) |
| createdAt | Team creation timestamp | DateTime (@default(now())) |
| updatedAt | Last modification timestamp | DateTime (@updatedAt) |

### TeamMember

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique team member identifier (primary key) | String (cuid) |
| teamId | Reference to team | String (FK) |
| userId | Reference to user | String (FK) |
| role | Member role (OWNER, ADMIN, MEMBER) | TeamRole (enum) |
| joinedAt | Timestamp when member joined team | DateTime (@default(now())) |

### Payment

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique payment identifier (primary key) | String (cuid) |
| userId | Reference to user making payment | String (FK) |
| orderId | Razorpay order ID (unique) | String (@unique) |
| paymentId | Razorpay payment ID (unique, nullable until paid) | String? (@unique) |
| amount | Payment amount in smallest currency unit (paise) | Int |
| currency | Currency code (default INR) | String (@default("INR")) |
| credits | Number of credits purchased | Int |
| status | Payment status (PENDING, SUCCESS, FAILED) | PaymentStatus (enum) |
| razorpaySignature | Razorpay signature for verification | String? |
| errorMessage | Error message if payment failed | String? |
| createdAt | Payment initiation timestamp | DateTime (@default(now())) |
| updatedAt | Last status update timestamp | DateTime (@updatedAt) |

### BatchJob

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique batch job identifier (primary key) | String (cuid) |
| userId | Reference to user who created batch job | String (FK) |
| text | Source text for batch generation | String (@db.Text) |
| selectedStyles | Array of style indices to generate | Int[] |
| totalItems | Total number of variants to generate | Int |
| status | Batch job status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED) | BatchStatus (enum) |
| createdAt | Batch job creation timestamp | DateTime (@default(now())) |
| updatedAt | Last status update timestamp | DateTime (@updatedAt) |

### BulkJob

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique bulk job identifier (primary key) | String (cuid) |
| userId | Reference to user who uploaded CSV | String (FK) |
| fileName | Original CSV file name | String |
| totalRows | Total rows in CSV file | Int |
| processedRows | Number of rows processed so far | Int (@default(0)) |
| successRows | Number of successfully processed rows | Int (@default(0)) |
| failedRows | Number of failed rows | Int (@default(0)) |
| status | Bulk job status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED) | BulkStatus (enum) |
| createdAt | Bulk job creation timestamp | DateTime (@default(now())) |
| updatedAt | Last status update timestamp | DateTime (@updatedAt) |

### BulkJobItem

| Data Attribute | Description | Data Type |
|----------------|-------------|-----------|
| id | Unique bulk job item identifier (primary key) | String (cuid) |
| bulkJobId | Reference to parent bulk job | String (FK) |
| rowNumber | Row number in CSV file (1-indexed) | Int |
| text | Text from CSV row | String (@db.Text) |
| style | Style index from CSV | Int |
| bias | Bias parameter from CSV | Float |
| status | Item processing status (PENDING, PROCESSING, COMPLETED, FAILED) | GenerationStatus (enum) |
| errorMessage | Error message if processing failed | String? |
| createdAt | Item creation timestamp | DateTime (@default(now())) |

---

## 4.3 Program Description

### 1. Introduction

**Purpose:**

The purpose of the Handwriting Synthesis project is to create a comprehensive AI-powered web platform that transforms digital text into authentic, personalized handwritten output through neural network-based stroke generation. The platform enables individuals, teams, and organizations to generate realistic handwriting for documents, communications, creative projects, and assistive applications with production-ready quality and scalability.

**Key Features:**

1. **User Authentication & Credit System:** Secure login with Google OAuth, Discord OAuth, and email/password credentials. Credit-based usage model with 10 free credits on signup, Razorpay payment integration for credit packages (Starter/Pro/Enterprise tiers), and detailed usage tracking.

2. **AI-Powered Handwriting Synthesis:** LSTM neural network with Mixture Density Network (MDN) output generates stroke sequences from text input. Support for 13 unique handwriting styles with adjustable bias parameter (0-1.5) controlling randomness vs. style adherence, customizable stroke colors and widths.

3. **Realistic Post-Processing:** Transform clean SVG output into authentic scanned handwriting with 6 paper types (white, cream, aged, lined, grid, recycled), 5 ink types (ballpoint, gel, fountain, marker, pencil), wear level simulation (0-1), and advanced effects including texture injection, edge roughness, and pressure variation.

4. **Gallery Management:** Persistent storage for all generated handwriting with full-text search, custom tagging, favorites marking, and paginated browsing. Filter by style, view detailed metadata (text, parameters, processing time), and batch delete capabilities.

5. **Team Collaboration:** Create team workspaces with unique slugs, invite members via email with role-based access (OWNER/ADMIN/MEMBER), manage shared credit pools, and maintain team-specific galleries for collaborative handwriting asset management.

6. **Batch & Bulk Processing:** Generate multiple style variants in parallel via Inngest background jobs. Upload CSV files for high-volume text processing with custom column mapping, track job progress with success/error counts, and export results as ZIP files containing all generated outputs.

7. **OCR/Handwriting Recognition:** Upload handwritten images for text extraction using TrOCR transformer models. Preprocessing includes grayscale conversion, adaptive thresholding, line segmentation, with fallback OCR (EasyOCR) and spell correction.

8. **Template System:** Pre-built templates (formal letter, sticky note, journal, invitation, certificate) with WYSIWYG editor for customizable text areas, positioning, and styling. Apply handwriting styles to template regions and export as PDF.

9. **Multi-Format Export:** SVG vector export for infinite scalability, PNG raster export with realistic effects, PDF export for print-ready documents, base64 encoding for inline transmission, and UploadThing CDN for permanent storage.

10. **Real-time Monitoring & Analytics:** Dashboard with generation history, credit consumption trends, style usage statistics, team activity logs, export format preferences, batch/bulk job status, and performance insights.

### 2. Overview

**Project Purpose:**

Handwriting Synthesis revolutionizes digital handwriting creation by providing an AI-powered platform that generates authentic, natural-looking handwriting indistinguishable from human writing. The system eliminates the time-consuming manual process of handwriting while preserving the personal touch and authenticity that make handwritten content valuable for personal communications, business applications, creative projects, and assistive technology use cases.

**Target Audience:**

This platform is designed for individuals, creative professionals, businesses, and organizations requiring authentic handwritten content. Primary users include content creators needing personalized handwriting for videos/graphics, marketing teams creating handwritten campaigns, individuals with motor impairments requiring assistive handwriting technology, agencies producing handwritten content at scale, educators creating personalized materials, and hobbyists exploring creative typography.

### 3. Functionality

**Key Features and Their Working:**

**1. User Authentication & Credit System**

**Working:** Users authenticate through NextAuth.js with Google OAuth, Discord OAuth, or email/password credentials. System assigns 10 free credits on registration. Credit-based operations (synthesis, realistic rendering, OCR) consume 1 credit each. Users purchase additional credits via Razorpay with three tiers: Starter (₹399/100 credits), Pro (₹1199/350 credits), Enterprise (₹3999/1500 credits). All credit transactions logged in Usage and SynthesisUsage tables.

**Validations:**
- Email format validation (z.string().email())
- Password minimum 8 characters with bcrypt hashing
- Credit balance check before any operation (throws FORBIDDEN if insufficient)
- Payment signature verification using Razorpay webhook validation

**2. Handwriting Synthesis Generation**

**Working:**
- **Input Validation:** Text limited to 20 lines × 75 chars/line. Character whitelist excludes Q, X, Z (uppercase) due to training data limitations.
- **API Call:** tRPC procedure calls Python FastAPI synthesis API with validated parameters (text, style 0-12, bias 0-1.5, strokeColor, strokeWidth 1-5).
- **Model Inference:** FastAPI lazy-loads TensorFlow LSTM model (400 units), performs attention-based character-stroke alignment, samples from 20-component MDN for stroke coordinates.
- **SVG Generation:** Stroke sequences converted to SVG paths with pen-up/pen-down handling, color and width application.
- **Credit Deduction:** Transaction atomically decrements user credits and logs SynthesisUsage record with metadata.

**Validations:**
- Text non-empty, within length limits (z.string().min(1).max(1500))
- Character whitelist check (Pydantic @field_validator)
- Style index 0-12 (z.number().min(0).max(12))
- Bias 0.0-1.5 (z.number().min(0).max(1.5))
- Stroke width 1-5px (z.number().min(1).max(5))

**3. Realistic Post-Processing**

**Working:**
- **SVG to Mask:** CairoSVG converts SVG to PNG, luminance extraction creates alpha mask representing ink darkness.
- **Paper Generation:** Perlin noise generates paper texture (4 octaves, configurable scale), base colors vary by paper type (white: #FCFCFA, cream: #FFFDF0, aged: #F5EBD2).
- **Effect Application:** Edge roughness adds micro-perturbations using noise displacement, pressure variation modulates stroke darkness via low-frequency noise.
- **Compositing:** Ink mask blended onto paper with 90% alpha, simulating ink absorption.
- **Wear Simulation:** Gaussian noise injection (scaled by wear_level 0-1), edge degradation via erosion/dilation.
- **Export:** Final result converted to base64 PNG and stored in SavedGeneration.realisticPng field.

**Validations:**
- Generation ownership verification (userId filter in query)
- Credit check before processing
- Paper type enum (z.enum(["white", "cream", "aged", "lined", "grid", "recycled"]))
- Ink type enum (z.enum(["ballpoint", "gel", "fountain", "marker", "pencil"]))
- Wear level 0.0-1.0 (z.number().min(0).max(1))

**4. Gallery Management**

**Working:** All SavedGeneration records displayed with pagination (20 items default, cursor-based). Full-text search on text field, tag filtering via array contains operator, favorites filtering via isFavorite boolean. Users can add custom tags (String[] array), mark favorites, view detailed metadata (style, bias, processing time), and batch delete selected items.

**Validations:**
- Ownership check on all operations (WHERE userId = session.user.id)
- Unique fileKey constraint prevents duplicate uploads
- Pagination limit 1-50 (z.number().min(1).max(50))

**5. Team Collaboration**

**Working:**
- **Team Creation:** User creates team with unique slug (validated against existing teams), becomes OWNER with full permissions.
- **Invitations:** OWNER/ADMIN sends email invitation with unique token (7-day expiry). Recipient accepts invitation → TeamMember record created with assigned role.
- **Shared Credits:** Team.credits field stores shared credit pool. Team members can use team credits for synthesis operations instead of personal credits.
- **Team Galleries:** Generations created within team context linked via SavedGeneration.teamId, viewable by all team members.
- **Role Management:** OWNER can promote/demote members (ADMIN ↔ MEMBER), remove members (deletes TeamMember record).

**Validations:**
- Unique team slug (z.string().regex(/^[a-z0-9-]+$/))
- Invitation email validity check
- Role permission checks before actions (OWNER/ADMIN required for invites)
- Cannot remove self from team
- @@unique constraint on [teamId, userId] prevents duplicate memberships

**6. Batch Processing**

**Working:**
- **Job Creation:** User selects multiple styles (1-13), single text input. BatchJob record created with PENDING status.
- **Inngest Trigger:** Event "synthesis/batch.requested" fired with batchJobId, userId, text, selectedStyles.
- **Parallel Generation:** Inngest worker fans out synthesis requests, one per style. Each synthesis processed in parallel (concurrency limit: 2 per user).
- **Result Storage:** Each successful synthesis creates SavedGeneration record linked to batchJobId, credits deducted per item.
- **Status Updates:** Job status transitions: PENDING → PROCESSING → COMPLETED/FAILED. Individual item statuses tracked separately.

**Validations:**
- Style array 1-13 items (z.array(z.number()).min(1).max(13))
- Credit pre-check (user.credits >= selectedStyles.length)
- Text validation same as single generation

**7. Bulk CSV Processing**

**Working:**
- **CSV Upload:** User uploads CSV with columns for text, style, bias (optional). System parses CSV, validates format.
- **BulkJob Creation:** BulkJob record created with totalRows count, PENDING status. BulkJobItem records created for each row.
- **Sequential Processing:** Inngest worker processes rows sequentially (prevents API overload). Each row generates handwriting, links to BulkJobItem.
- **Progress Tracking:** processedRows, successRows, failedRows updated in real-time. Errors logged in BulkJobItem.errorMessage.
- **ZIP Export:** On completion, system generates ZIP containing all SVG/PNG files, downloadable via temporary URL.

**Validations:**
- CSV format validation (must have 'text' column minimum)
- Row limit (e.g., max 100 rows per job)
- Per-row text/style/bias validation same as single generation
- Credit check: user.credits >= totalRows

**8. OCR/Handwriting Recognition**

**Working:**
- **Image Upload:** User uploads JPG/PNG image via react-dropzone.
- **Preprocessing:** Python FastAPI converts to grayscale, applies adaptive thresholding, performs skew correction via contour analysis.
- **Line Segmentation:** Horizontal projection identifies text lines, splits image into line segments.
- **TrOCR Inference:** Each line processed through microsoft/trocr-base-handwritten model (Vision Transformer encoder + GPT decoder). Confidence scores computed.
- **Fallback OCR:** Low-confidence lines (<0.7) re-processed with EasyOCR for improved accuracy.
- **Spell Correction:** PySpellChecker dictionary-based correction, autocorrect library for context-aware fixes.
- **Output:** Structured JSON with per-line text and confidence scores.

**Validations:**
- Image format (JPG, PNG only)
- Image size limit (e.g., 10MB max)
- Credit check (1 credit per OCR operation)
- File upload authentication via middleware

### 4. User Interface (UI) Components

**Main UI Elements Across Pages:**

**1. Synthesis Page:**
- **Components:** Multi-line textarea for text input (max 1500 chars), style selector dropdown (0-12 styles with preview), bias slider (0-1.5 with live value display), color picker (hex input), stroke width slider (1-5px), "Generate" button with loading state.
- **Functionality:** Real-time character/line count display, validation error messages, SVG preview panel updating on generation, "Save to Gallery" button post-generation.

**2. Gallery Page:**
- **Components:** Grid/list view toggle, search bar with debounced input, tag filter multi-select, favorites filter toggle, style filter dropdown, infinite scroll pagination, generation cards with preview thumbnails.
- **Functionality:** Click card to view full SVG/PNG, favorite toggle icon, tag management modal, batch selection checkboxes, "Delete Selected" bulk action, "Apply Realistic Effects" action per card.

**3. Team Management Page:**
- **Components:** Team creation form (name, slug, description), member list table with role badges, invite member form (email, role selector), team settings (credit management), team gallery view.
- **Functionality:** Send invitations via email, promote/demote member role buttons (OWNER/ADMIN only), remove member action with confirmation, team credit balance display, team-wide generation statistics.

**4. Credit Purchase Page:**
- **Components:** Credit package cards (Starter/Pro/Enterprise) with pricing, current credit balance badge, Razorpay checkout modal, payment history table.
- **Functionality:** Select package → initiate Razorpay order → redirect to payment gateway → webhook validates payment → credits added to account.

**5. Batch/Bulk Processing Page:**
- **Components:** Style multi-select checkboxes (batch), CSV upload dropzone with format instructions (bulk), job status table with progress bars, individual item status badges.
- **Functionality:** Track job progress in real-time, view per-item results, cancel in-progress jobs with credit refunds, download ZIP export on completion.

### 5. Analysis Based on UI Images and Code

**1. Synthesis and Generation Pages:**

**UI Analysis:**
- Clean, modern interface following Tailwind CSS design system with consistent spacing and typography.
- Parameter controls organized vertically on left sidebar, live preview occupying main content area on right.
- Real-time validation feedback with inline error messages below input fields.

**Code Analysis:**
- React Server Components for initial page load, Client Components for interactive controls (textarea, sliders, color picker).
- tRPC useMutation hook handles synthesis API calls with onSuccess/onError callbacks for state management.
- Optimistic UI updates show loading spinner during generation, success state shows preview with "Save" action.

**2. Gallery and Management:**

**UI Analysis:**
- Masonry grid layout for generation cards, responsive breakpoints (1 col mobile, 2 col tablet, 3-4 col desktop).
- Filter sidebar with collapsible sections (Search, Tags, Favorites, Style), applied filters shown as dismissible chips.
- Hover states reveal action buttons (View, Favorite, Delete, Apply Effects).

**Code Analysis:**
- React Query infinite scroll pagination with useInfiniteQuery hook, cursor-based fetching for performance.
- Filter state managed via URL search params for shareable filtered views.
- Batch actions use Promise.all for parallel deletions, wrapped in transaction for atomicity.

**3. Team Collaboration:**

**UI Analysis:**
- Team selector dropdown in navbar for switching active context (personal vs. team workspaces).
- Role-based UI rendering hides admin actions from MEMBER role users.
- Invitation flow uses modal dialog with stepper UI (Enter email → Select role → Confirm).

**Code Analysis:**
- Permission checking via custom hook useTeamPermissions(teamId, userId) before rendering admin controls.
- TeamInvite records have 7-day expiry enforced via database query filter (WHERE expiresAt > NOW()).
- Email invitations sent via nodemailer with handlebars templates, token embedded in accept URL.

**4. Payment Integration:**

**UI Analysis:**
- Credit package cards use pricing tables with feature comparison (credits per package, effective cost per credit).
- Razorpay checkout modal opens on package selection, inline loading state during order creation.
- Success/failure states handled with toast notifications.

**Code Analysis:**
- Razorpay order creation via tRPC procedure, returns orderId and key for frontend checkout.
- Payment verification webhook (POST /api/razorpay/webhook) validates signature, updates Payment record status.
- Credits added via atomic transaction: Payment record + User credits increment.

---

## 4.4 Naming Convention

**File Naming:**

| Type | Convention | Example |
|------|------------|---------|
| React Components | kebab-case.tsx | `synthesis-dashboard.tsx` |
| Python Modules | snake_case.py | `post_processing.py`, `trocr_ocr.py` |
| Prisma Schema | schema.prisma | `schema.prisma` |
| tRPC Routers | kebab-case.ts | `synthesis.ts`, `teams.ts`, `credits.ts` |
| Config Files | kebab-case.js/ts | `next.config.js`, `tailwind.config.ts` |

**Variable Naming:**

| Language | Convention | Example |
|----------|------------|---------|
| TypeScript Variables | camelCase | `strokeColor`, `userId`, `batchJobId` |
| TypeScript Constants | UPPER_SNAKE_CASE | `MAX_LINES`, `VALID_CHARS`, `SYNTHESIS_API_URL` |
| Python Variables | snake_case | `stroke_color`, `user_id`, `paper_type` |
| Python Constants | UPPER_SNAKE_CASE | `MAX_LINES`, `VALID_CHARS`, `MAX_CHARS_PER_LINE` |
| Database Fields | camelCase (Prisma) | `createdAt`, `strokeWidth`, `batchJobId` |

**Function Naming:**

| Type | Convention | Example |
|------|------------|---------|
| TypeScript Functions | camelCase | `handleGenerate()`, `validateText()`, `checkCredits()` |
| React Hooks | use prefix + camelCase | `useState`, `useSession`, `useMutation` |
| Python Functions | snake_case | `get_hand()`, `process_realistic_base64()`, `generate_perlin_noise()` |
| tRPC Procedures | camelCase verbs | `generate`, `makeRealistic`, `getGallery`, `saveGeneration` |
| API Endpoints | kebab-case | `/synthesize`, `/process/realistic`, `/ocr/recognize` |

**Type/Class Naming:**

| Type | Convention | Example |
|------|------------|---------|
| TypeScript Interfaces | PascalCase | `SynthesisRequest`, `GalleryItem`, `TeamMember` |
| Python Classes | PascalCase | `SynthesisRequest`, `PaperType`, `InkType` |
| Enums | PascalCase | `GenerationStatus`, `TeamRole`, `PaymentStatus` |
| Prisma Models | PascalCase | `User`, `SavedGeneration`, `Team`, `BatchJob` |

**React Components:**

| Type | Convention | Example |
|------|------------|---------|
| Page Components | PascalCase + "Page" | `SynthesisPage`, `GalleryPage`, `TeamPage` |
| UI Components | PascalCase | `Button`, `Input`, `Modal`, `Navbar` |
| Layout Components | PascalCase + "Layout" | `DashboardLayout`, `AuthLayout` |

**tRPC & API:**

| Type | Convention | Example |
|------|------------|---------|
| Router Names | camelCase + "Router" | `synthesisRouter`, `teamsRouter`, `creditsRouter` |
| Procedure Names | camelCase action verbs | `create`, `update`, `delete`, `list`, `get` |
| Event Names | domain/action.state | `synthesis/batch.requested`, `payment/order.verified` |

---

## 4.5 Validations

**User Authentication Forms:**

- **Email validation:** All authentication routes require valid email format using z.string().email(). Duplicate email check queries database with unique constraint preventing registration with existing email.
- **Password strength:** Credentials provider enforces minimum 8 characters using z.string().min(8). Passwords hashed with bcrypt (10 salt rounds) before storage.
- **OAuth validation:** Google and Discord providers validate tokens via provider APIs. Email linking allowed (allowDangerousEmailAccountLinking: true) to merge OAuth and credentials accounts.

**Handwriting Synthesis Input:**

- **Text validation:** Both client (TypeScript) and server (Python Pydantic) enforce:
  - Non-empty text (z.string().min(1) / if not v.strip(): raise ValueError)
  - Maximum 20 lines (len(lines) > MAX_LINES check)
  - Maximum 75 chars per line (len(line) > MAX_CHARS_PER_LINE check)
  - Character whitelist (VALID_CHARS set excludes Q, X, Z uppercase)
  - Invalid character reporting lists offending characters in error message

- **Numeric parameter constraints:**
  - Style: z.number().min(0).max(12) ensures valid style index
  - Bias: z.number().min(0).max(1.5) constrains randomness parameter
  - Stroke width: z.number().min(1).max(5) limits pixel width range
  - Wear level: z.number().min(0).max(1) bounds degradation intensity

**Realistic Rendering Options:**

- **Enum validations:**
  - Paper type: z.enum(["white", "cream", "aged", "lined", "grid", "recycled"]) rejects invalid paper selections
  - Ink type: z.enum(["ballpoint", "gel", "fountain", "marker", "pencil"]) restricts ink options
  - Python backend uses Enum classes (PaperType, InkType) for additional type safety

**Gallery and Storage:**

- **Ownership verification:** All gallery queries include userId filter (WHERE userId = ctx.session.user.id) preventing access to other users' generations. Returns NOT_FOUND rather than FORBIDDEN to prevent resource enumeration.
- **File upload limits:** UploadThing configured for SVG files (image/svg+xml MIME type) with 4MB max size. Middleware verifies authentication before accepting uploads.
- **Unique constraints:** Database enforces unique fileKey and uploadKey preventing duplicate file references. Email field on User also unique to prevent duplicate accounts.

**Team Management:**

- **Slug validation:** Team slug must match pattern /^[a-z0-9-]+$/ (lowercase alphanumeric + hyphens only). Database unique constraint prevents duplicate slugs.
- **Role permissions:** Before team operations, system checks user role via TeamMember query. OWNER-only actions (delete team, transfer ownership) blocked for ADMIN/MEMBER roles.
- **Invitation expiry:** TeamInvite records filtered by expiresAt > NOW() before acceptance. Expired invitations rejected with appropriate error message.

**Credit System:**

- **Balance checks:** All credit-consuming operations (synthesis, realistic rendering, OCR, batch, bulk) query user.credits before execution. If credits < required amount, throws TRPCError with code FORBIDDEN and message "Insufficient credits".
- **Atomic transactions:** Credit deduction and usage logging wrapped in Prisma transaction ensuring both operations succeed/fail together (prevents credit loss on failed operations).
- **Payment verification:** Razorpay webhook validates payment signature using crypto.createHmac comparing signature with computed hash. Only verified payments trigger credit addition.

**Batch and Bulk Processing:**

- **Array length limits:**
  - Batch: z.array(z.number()).min(1).max(13) ensures 1-13 style variants (matching available styles)
  - Bulk: CSV row count limited (e.g., 100 rows max) to prevent resource exhaustion

- **Credit pre-checks:** Before creating BatchJob/BulkJob, system verifies user.credits >= total required credits. Job creation rejected if insufficient credits, preventing partially completed jobs.
- **Job cancellation refunds:** When user cancels PENDING/PROCESSING job, system calculates unused credits and refunds via User.credits increment. Only unprocessed items eligible for refund.

**OCR Upload:**

- **Image format:** react-dropzone accept configuration limits uploads to image/jpeg and image/png MIME types. File extension check (.jpg, .jpeg, .png) as secondary validation.
- **Image size:** Maximum 10MB upload size enforced via UploadThing configuration and client-side validation before upload attempt.
- **Credit consumption:** OCR operation consumes 1 credit verified before image processing begins. Failed OCR does not deduct credit (error handling includes credit rollback).

**API Route Usage:**

These validation schemas applied consistently across the stack:
- **tRPC procedures:** Input parsed with .input(z.object(...)) throwing TRPCError on validation failure (code: BAD_REQUEST, FORBIDDEN, etc.)
- **FastAPI endpoints:** Pydantic models with @field_validator decorators raise ValueError automatically converted to 400 Bad Request
- **Database constraints:** Prisma enforces unique constraints, foreign key checks, and type validation at database level as final safety layer
- **Dual-layer validation:** Both frontend (type-safe tRPC inputs) and backend (Pydantic/Zod) validation ensures data integrity regardless of API access method

**Error Handling Patterns:**

- **Validation errors:** Return 400 Bad Request with specific validation message listing fields and constraints violated
- **Authentication errors:** Return 401 Unauthorized when session missing or invalid
- **Authorization errors:** Return 403 Forbidden when user lacks required permissions (insufficient credits, wrong team role, etc.)
- **Not found errors:** Return 404 Not Found for missing resources with ownership filtering (prevents enumeration)
- **Server errors:** Return 500 Internal Server Error with generic message (detailed error logged server-side only)
