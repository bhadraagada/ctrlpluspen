import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const creditsRouter = createTRPCRouter({
  // Get current user's credits
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { credits: true },
    });

    return {
      credits: user?.credits ?? 0,
    };
  }),

  // Get available credit packages
  getPackages: publicProcedure.query(async ({ ctx }) => {
    const packages = await ctx.db.creditPackage.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });

    // If no packages exist, return default packages
    if (packages.length === 0) {
      return [
        {
          id: "starter",
          name: "Starter",
          credits: 50,
          price: 4.99,
          description: "Perfect for trying out the service",
          popular: false,
        },
        {
          id: "pro",
          name: "Pro",
          credits: 200,
          price: 14.99,
          description: "Best value for regular users",
          popular: true,
        },
        {
          id: "enterprise",
          name: "Enterprise",
          credits: 1000,
          price: 49.99,
          description: "For high-volume users",
          popular: false,
        },
      ];
    }

    return packages;
  }),

  // Get payment history
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const payments = await ctx.db.payment.findMany({
        where: { userId: ctx.session.user.id },
        take: input.limit,
        orderBy: { createdAt: "desc" },
      });

      return payments;
    }),

  // Create a payment intent (placeholder for Stripe integration)
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        packageId: z.string(),
        credits: z.number().min(1),
        amount: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create pending payment record
      const payment = await ctx.db.payment.create({
        data: {
          userId: ctx.session.user.id,
          amount: input.amount,
          credits: input.credits,
          status: "PENDING",
        },
      });

      // TODO: Integrate with Stripe
      // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      // const session = await stripe.checkout.sessions.create({
      //   payment_method_types: ['card'],
      //   line_items: [...],
      //   mode: 'payment',
      //   success_url: `${process.env.NEXT_PUBLIC_URL}/credits?success=true`,
      //   cancel_url: `${process.env.NEXT_PUBLIC_URL}/credits?canceled=true`,
      //   metadata: { paymentId: payment.id },
      // });

      return {
        paymentId: payment.id,
        // For now, return a mock checkout URL
        // In production, return the Stripe checkout URL
        checkoutUrl: `/credits/checkout/${payment.id}`,
      };
    }),

  // Complete payment (called by webhook or for demo purposes)
  completePayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (payment.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      if (payment.status === "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment already completed",
        });
      }

      // Complete payment and add credits in a transaction
      const [updatedPayment, updatedUser] = await ctx.db.$transaction([
        ctx.db.payment.update({
          where: { id: input.paymentId },
          data: { status: "COMPLETED" },
        }),
        ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { credits: { increment: payment.credits } },
        }),
      ]);

      return {
        success: true,
        credits: updatedUser.credits,
        creditsAdded: payment.credits,
      };
    }),

  // Add free credits (for demo/testing)
  addFreeCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(1).max(10).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has already claimed free credits today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recentFreeCredits = await ctx.db.payment.findFirst({
        where: {
          userId: ctx.session.user.id,
          amount: 0,
          createdAt: { gte: today },
        },
      });

      if (recentFreeCredits) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already claimed free credits today. Come back tomorrow!",
        });
      }

      // Add free credits
      const [_, updatedUser] = await ctx.db.$transaction([
        ctx.db.payment.create({
          data: {
            userId: ctx.session.user.id,
            amount: 0,
            credits: input.amount,
            status: "COMPLETED",
          },
        }),
        ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { credits: { increment: input.amount } },
        }),
      ]);

      return {
        success: true,
        credits: updatedUser.credits,
        creditsAdded: input.amount,
      };
    }),
});
