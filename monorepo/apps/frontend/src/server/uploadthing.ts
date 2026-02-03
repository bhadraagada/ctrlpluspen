import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "~/server/auth";

const f = createUploadthing();

export const ourFileRouter = {
  // For saving generated handwriting SVGs
  handwritingSvg: f({ "image/svg+xml": { maxFileSize: "4MB", maxFileCount: 10 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { url: file.url, userId: metadata.userId };
    }),

  // For batch uploads (multiple SVGs at once)
  batchHandwritingSvg: f({ "image/svg+xml": { maxFileSize: "4MB", maxFileCount: 20 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, userId: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
