import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Define the CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: corsHeaders });
}

// Handle the POST request for checkout
export async function POST(req: NextRequest) {
  try {
    const { cartItems, customer } = await req.json();

    // Validate the request data
    if (!cartItems || !customer) {
      return new NextResponse("Not enough data to checkout", { status: 400, headers: corsHeaders });
    }

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["IN"],
      },
      shipping_options: [
        { shipping_rate: "shr_1PhEaZSD4BCfidA3J2gHuOvL" },
        { shipping_rate: "shr_1PhE2hSD4BCfidA3DnEx0ZsY" },
        // { shipping_rate: "shr_1PhE6eSD4BCfidA3n5oY5kRm" },
      ],
      line_items: cartItems.map((cartItem: any) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: cartItem.item.title,
            metadata: {
              productId: cartItem.item._id,
              ...(cartItem.size && { size: cartItem.size }),
              ...(cartItem.color && { color: cartItem.color }),
            },
          },
          unit_amount: cartItem.item.price * 100,
        },
        quantity: cartItem.quantity,
      })),
      client_reference_id: customer.clerkId,
      success_url: `${process.env.NEXT_PUBLIC_ECOMMERCE_STORE_URL}/payment_success`,
      cancel_url: `${process.env.NEXT_PUBLIC_ECOMMERCE_STORE_URL}/cart`,
    });

    // Respond with the session details and CORS headers
    return new NextResponse(JSON.stringify(session), { headers: corsHeaders });
  } catch (err) {
    console.log("[checkout_POST]", err);
    return new NextResponse("Internal Server Error", { status: 500, headers: corsHeaders });
  }
}
