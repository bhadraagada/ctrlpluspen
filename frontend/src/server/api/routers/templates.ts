import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

// Default system templates
const SYSTEM_TEMPLATES = [
  {
    id: "letter-formal",
    name: "Formal Letter",
    description: "Professional business letter with header, body, and signature areas",
    category: "LETTER",
    config: {
      pageSize: "A4",
      orientation: "portrait",
      margins: { top: 60, right: 50, bottom: 60, left: 50 },
      backgroundColor: "#ffffff",
      textAreas: [
        { id: "sender", label: "Sender Address", x: 50, y: 60, width: 200, height: 80, fontSize: 12 },
        { id: "date", label: "Date", x: 50, y: 160, width: 150, height: 30, fontSize: 12 },
        { id: "recipient", label: "Recipient Address", x: 50, y: 210, width: 250, height: 80, fontSize: 12 },
        { id: "salutation", label: "Salutation", x: 50, y: 310, width: 200, height: 30, fontSize: 14 },
        { id: "body", label: "Letter Body", x: 50, y: 360, width: 495, height: 350, fontSize: 14 },
        { id: "closing", label: "Closing", x: 50, y: 730, width: 150, height: 30, fontSize: 14 },
        { id: "signature", label: "Signature", x: 50, y: 780, width: 200, height: 50, fontSize: 16 },
      ],
    },
  },
  {
    id: "note-sticky",
    name: "Sticky Note",
    description: "Quick note on a colored sticky background",
    category: "NOTE",
    config: {
      pageSize: "custom",
      width: 300,
      height: 300,
      orientation: "portrait",
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      backgroundColor: "#fff9c4",
      textAreas: [
        { id: "content", label: "Note Content", x: 20, y: 20, width: 260, height: 260, fontSize: 16 },
      ],
    },
  },
  {
    id: "journal-daily",
    name: "Daily Journal",
    description: "Journal page with date header and lined writing area",
    category: "JOURNAL",
    config: {
      pageSize: "A5",
      orientation: "portrait",
      margins: { top: 40, right: 30, bottom: 40, left: 30 },
      backgroundColor: "#fefcf3",
      showLines: true,
      lineSpacing: 28,
      textAreas: [
        { id: "date", label: "Date", x: 30, y: 40, width: 200, height: 30, fontSize: 14 },
        { id: "title", label: "Title/Mood", x: 30, y: 80, width: 300, height: 35, fontSize: 18 },
        { id: "content", label: "Journal Entry", x: 30, y: 130, width: 350, height: 450, fontSize: 14 },
      ],
    },
  },
  {
    id: "invitation-simple",
    name: "Simple Invitation",
    description: "Elegant invitation card for events",
    category: "INVITATION",
    config: {
      pageSize: "custom",
      width: 500,
      height: 350,
      orientation: "landscape",
      margins: { top: 40, right: 40, bottom: 40, left: 40 },
      backgroundColor: "#f8f5f0",
      border: { width: 2, color: "#d4af37", style: "double" },
      textAreas: [
        { id: "heading", label: "You're Invited", x: 40, y: 40, width: 420, height: 40, fontSize: 24, align: "center" },
        { id: "event", label: "Event Name", x: 40, y: 100, width: 420, height: 35, fontSize: 20, align: "center" },
        { id: "details", label: "Date, Time & Venue", x: 40, y: 160, width: 420, height: 100, fontSize: 14, align: "center" },
        { id: "rsvp", label: "RSVP", x: 40, y: 280, width: 420, height: 30, fontSize: 12, align: "center" },
      ],
    },
  },
  {
    id: "certificate-achievement",
    name: "Achievement Certificate",
    description: "Formal certificate for awards and recognition",
    category: "CERTIFICATE",
    config: {
      pageSize: "A4",
      orientation: "landscape",
      margins: { top: 50, right: 60, bottom: 50, left: 60 },
      backgroundColor: "#fffef5",
      border: { width: 4, color: "#1a365d", style: "double" },
      textAreas: [
        { id: "title", label: "Certificate Title", x: 60, y: 50, width: 677, height: 50, fontSize: 32, align: "center" },
        { id: "subtitle", label: "Subtitle", x: 60, y: 110, width: 677, height: 30, fontSize: 16, align: "center" },
        { id: "recipient", label: "Recipient Name", x: 60, y: 180, width: 677, height: 50, fontSize: 28, align: "center" },
        { id: "description", label: "Achievement Description", x: 100, y: 260, width: 597, height: 100, fontSize: 14, align: "center" },
        { id: "date", label: "Date", x: 60, y: 400, width: 200, height: 30, fontSize: 12 },
        { id: "signature", label: "Signature", x: 500, y: 400, width: 237, height: 50, fontSize: 14, align: "right" },
      ],
    },
  },
];

export const templatesRouter = createTRPCRouter({
  // Get all available templates (system + user created)
  getAll: protectedProcedure
    .input(
      z.object({
        category: z.enum(["LETTER", "NOTE", "JOURNAL", "INVITATION", "CERTIFICATE", "CUSTOM"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const templates = await ctx.db.template.findMany({
        where: {
          OR: [
            { isSystem: true },
            { createdById: ctx.session.user.id },
          ],
          ...(input?.category && { category: input.category }),
        },
        orderBy: [{ isSystem: "desc" }, { usageCount: "desc" }, { createdAt: "desc" }],
      });

      // If no templates exist, seed system templates
      if (templates.length === 0) {
        return SYSTEM_TEMPLATES.map((t) => ({
          ...t,
          isSystem: true,
          usageCount: 0,
          createdById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      }

      return templates;
    }),

  // Get a single template by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if it's a system template ID
      const systemTemplate = SYSTEM_TEMPLATES.find((t) => t.id === input.id);
      if (systemTemplate) {
        return {
          ...systemTemplate,
          isSystem: true,
          usageCount: 0,
          createdById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      const template = await ctx.db.template.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return template;
    }),

  // Create a custom template
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        category: z.enum(["LETTER", "NOTE", "JOURNAL", "INVITATION", "CERTIFICATE", "CUSTOM"]),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.template.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          config: input.config,
          isSystem: false,
          createdById: ctx.session.user.id,
        },
      });

      return template;
    }),

  // Get user's documents
  getDocuments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const documents = await ctx.db.templateDocument.findMany({
        where: { userId: ctx.session.user.id },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: "desc" },
        include: {
          template: {
            select: { name: true, category: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (documents.length > input.limit) {
        const nextItem = documents.pop();
        nextCursor = nextItem?.id;
      }

      return { items: documents, nextCursor };
    }),

  // Create a new document from a template
  createDocument: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        name: z.string().min(1).max(100).optional(),
        content: z.record(z.string()),
        style: z.number().min(0).max(12).optional(),
        bias: z.number().min(0).max(1.25).optional(),
        strokeColor: z.string().optional(),
        strokeWidth: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if template exists (or is a system template)
      const systemTemplate = SYSTEM_TEMPLATES.find((t) => t.id === input.templateId);
      let templateId = input.templateId;

      if (!systemTemplate) {
        const dbTemplate = await ctx.db.template.findUnique({
          where: { id: input.templateId },
        });
        if (!dbTemplate) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }
      } else {
        // Create the system template in DB if it doesn't exist
        const existing = await ctx.db.template.findUnique({ where: { id: input.templateId } });
        if (!existing) {
          await ctx.db.template.create({
            data: {
              id: systemTemplate.id,
              name: systemTemplate.name,
              description: systemTemplate.description,
              category: systemTemplate.category as any,
              config: systemTemplate.config,
              isSystem: true,
            },
          });
        }
      }

      // Update template usage count
      await ctx.db.template.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {}); // Ignore if template doesn't exist yet

      const document = await ctx.db.templateDocument.create({
        data: {
          userId: ctx.session.user.id,
          templateId: templateId,
          name: input.name ?? "Untitled Document",
          content: input.content,
          style: input.style ?? 9,
          bias: input.bias ?? 0.75,
          strokeColor: input.strokeColor ?? "#000000",
          strokeWidth: input.strokeWidth ?? 2,
          status: "PENDING",
        },
      });

      return document;
    }),

  // Update document content
  updateDocument: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        content: z.record(z.string()).optional(),
        style: z.number().min(0).max(12).optional(),
        bias: z.number().min(0).max(1.25).optional(),
        strokeColor: z.string().optional(),
        strokeWidth: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.templateDocument.findUnique({
        where: { id: input.id },
      });

      if (!document || document.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      const updated = await ctx.db.templateDocument.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.content && { content: input.content }),
          ...(input.style !== undefined && { style: input.style }),
          ...(input.bias !== undefined && { bias: input.bias }),
          ...(input.strokeColor && { strokeColor: input.strokeColor }),
          ...(input.strokeWidth !== undefined && { strokeWidth: input.strokeWidth }),
          status: "PENDING", // Reset status when content changes
          previewSvg: null,
        },
      });

      return updated;
    }),

  // Delete a document
  deleteDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.templateDocument.findUnique({
        where: { id: input.id },
      });

      if (!document || document.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      await ctx.db.templateDocument.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // Get document by ID
  getDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.templateDocument.findUnique({
        where: { id: input.id },
        include: {
          template: true,
        },
      });

      if (!document || document.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      // If template is a system template ID but not in DB, return with embedded config
      if (!document.template) {
        const systemTemplate = SYSTEM_TEMPLATES.find((t) => t.id === document.templateId);
        if (systemTemplate) {
          return {
            ...document,
            template: {
              ...systemTemplate,
              isSystem: true,
              usageCount: 0,
              createdById: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          };
        }
      }

      return document;
    }),
});
