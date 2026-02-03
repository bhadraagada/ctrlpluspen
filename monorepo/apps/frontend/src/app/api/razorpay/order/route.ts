import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Lazy initialize Razorpay instance
let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay keys not configured");
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { amount, credits, packageId } = (await request.json()) as {
      amount: number; // Amount in paise (INR subunit)
      credits: number;
      packageId: string;
    };

    // Validate input
    if (!amount || !credits) {
      return NextResponse.json(
        { error: "Amount and credits are required" },
        { status: 400 }
      );
    }

    // Get Razorpay instance
    let razorpay: Razorpay;
    try {
      razorpay = getRazorpay();
    } catch (error) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // Create a pending payment record in database
    const payment = await db.payment.create({
      data: {
        userId: session.user.id,
        amount: amount / 100, // Store in rupees
        credits: credits,
        status: "PENDING",
      },
    });

    // Create Razorpay order
    const options = {
      amount: amount, // Amount in paise
      currency: "INR",
      receipt: `receipt_${payment.id}`,
      notes: {
        paymentId: payment.id,
        userId: session.user.id,
        credits: credits.toString(),
        packageId: packageId,
      },
    };

    const order = await razorpay.orders.create(options);

    // Update payment with Razorpay order ID
    await db.payment.update({
      where: { id: payment.id },
      data: { razorpayOrderId: order.id },
    });

    return NextResponse.json(
      {
        orderId: order.id,
        paymentId: payment.id,
        amount: order.amount,
        currency: order.currency,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
