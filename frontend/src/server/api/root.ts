import { postRouter } from "~/server/api/routers/post";
import { ocrRouter } from "~/server/api/routers/ocr";
import { creditsRouter } from "~/server/api/routers/credits";
import { authRouter } from "~/server/api/routers/auth";
import { synthesisRouter } from "~/server/api/routers/synthesis";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  ocr: ocrRouter,
  credits: creditsRouter,
  auth: authRouter,
  synthesis: synthesisRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
