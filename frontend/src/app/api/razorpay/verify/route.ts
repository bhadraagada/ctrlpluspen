import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Generate signature for verification
function generateSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string
): string {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("Razorpay key secret is not defined");
  }

  const signature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return signature;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", isOk: false },
        { status: 401 }
      );
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentId,
    } = (await request.json()) as {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      paymentId: string;
    };

    // Validate input
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
      return NextResponse.json(
        { error: "Missing required fields", isOk: false },
        { status: 400 }
      );
    }

    // Generate signature and verify
    const generatedSignature = generateSignature(razorpayOrderId, razorpayPaymentId);

    if (generatedSignature !== razorpaySignature) {
      // Update payment status to FAILED
      await db.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: "Payment verification failed", isOk: false },
        { status: 400 }
      );
    }

    // Get the payment record
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found", isOk: false },
        { status: 404 }
      );
    }

    // Verify the payment belongs to the current user
    if (payment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized", isOk: false },
        { status: 403 }
      );
    }

    // Check if already completed
    if (payment.status === "COMPLETED") {
      return NextResponse.json(
        { message: "Payment already processed", isOk: true },
        { status: 200 }
      );
    }

    // Complete payment and add credits in a transaction
    const [updatedPayment, updatedUser] = await db.$transaction([
      db.payment.update({
        where: { id: paymentId },
        data: {
          status: "COMPLETED",
          razorpayPaymentId: razorpayPaymentId,
        },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: { credits: { increment: payment.credits } },
      }),
    ]);

    return NextResponse.json(
      {
        message: "Payment verified successfully",
        isOk: true,
        credits: updatedUser.credits,
        creditsAdded: payment.credits,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Payment verification failed", isOk: false },
      { status: 500 }
    );
  }
}
