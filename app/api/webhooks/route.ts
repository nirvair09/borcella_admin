import Customer from "@/lib/models/Customer";
import Order from "@/lib/models/Order";
import { connectToDB } from "@/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const POST = async (req: NextRequest) => {
  try {
    // Log the raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get("Stripe-Signature") as string;
    console.log('Stripe-Signature:', signature);

    // Verify the webhook event
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('Stripe Event:', event);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Extract customer info from the session
      const customerInfo = {
        clerkId: session?.client_reference_id,
        name: session?.customer_details?.name,
        email: session?.customer_details?.email,
      };
      console.log('Customer Info:', customerInfo);

      // Extract shipping address from the session
      const shippingAddress = {
        street: session?.shipping_details?.address?.line1,
        city: session?.shipping_details?.address?.city,
        state: session?.shipping_details?.address?.state,
        postalCode: session?.shipping_details?.address?.postal_code,
        country: session?.shipping_details?.address?.country,
      };
      console.log('Shipping Address:', shippingAddress);

      // Retrieve session with expanded line items
      const retrieveSession = await stripe.checkout.sessions.retrieve(
        session.id,
        { expand: ["line_items.data.price.product"] }
      );
      console.log('Retrieve Session:', retrieveSession);

      const lineItems = retrieveSession?.line_items?.data;
      console.log('Line Items:', lineItems);

      // Map line items to order items
      const orderItems = lineItems?.map((item: any) => ({
        product: item.price.product.metadata.productId,
        color: item.price.product.metadata.color || "N/A",
        size: item.price.product.metadata.size || "N/A",
        quantity: item.quantity,
      })) || [];
      console.log('Order Items:', orderItems);

      await connectToDB();
      console.log('Connected to MongoDB');

      // Create and save a new order
      const newOrder = new Order({
        customerClerkId: customerInfo.clerkId,
        products: orderItems,
        shippingAddress,
        shippingRate: session?.shipping_cost?.shipping_rate,
        totalAmount: session.amount_total ? session.amount_total / 100 : 0, // Convert to dollars
      });

      await newOrder.save();
      console.log('New Order Saved:', newOrder);

      // Find or create customer and update orders
      let customer = await Customer.findOne({ clerkId: customerInfo.clerkId });

      if (customer) {
        customer.orders.push(newOrder._id);
      } else {
        customer = new Customer({
          ...customerInfo,
          orders: [newOrder._id],
        });
      }

      await customer.save();
      console.log('Customer Saved:', customer);
    }

    return new NextResponse("Order created", { status: 200 });
  } catch (err) {
    console.log("[webhooks_POST]", err);
    return new NextResponse("Failed to create the order", { status: 500 });
   }
};
