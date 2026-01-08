import { serve } from "inngest/next";
import { inngest } from "~/inngest/client";
import { functions } from "~/inngest/functions";

// Create an API route that serves Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
