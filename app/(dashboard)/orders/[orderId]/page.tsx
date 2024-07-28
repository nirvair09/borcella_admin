import { DataTable } from "@/components/custom ui/DataTable";
import { columns } from "@/components/orderItems/OrderItemsColums";

const OrderDetails = async ({ params }: { params: { orderId: string } }) => {
  try {
    const res = await fetch(
      `${process.env.ADMIN_DASHBOARD_URL}/api/orders/${params.orderId}`
    );

    if (!res.ok) {
      throw new Error(`Error fetching order details: ${res.statusText}`);
    }

    const { orderDetails, customer } = await res.json();

    console.log("Order Details:", orderDetails);
    console.log("Customer:", customer);

    if (!orderDetails || !customer) {
      throw new Error("Missing order details or customer data");
    }

    const { street, city, state, postalCode, country } =
      orderDetails.shippingAddress;

    return (
      <div className="flex flex-col p-10 gap-5">
        <p className="text-base-bold">
          Order ID: <span className="text-base-medium">{orderDetails._id}</span>
        </p>
        <p className="text-base-bold">
          Customer name:{" "}
          <span className="text-base-medium">{customer.name}</span>
        </p>
        <p className="text-base-bold">
          Shipping address:{" "}
          <span className="text-base-medium">
            {street}, {city}, {state}, {postalCode}, {country}
          </span>
        </p>
        <p className="text-base-bold">
          Total Paid:{" "}
          <span className="text-base-medium">${orderDetails.totalAmount}</span>
        </p>
        <p className="text-base-bold">
          Shipping rate ID:{" "}
          <span className="text-base-medium">{orderDetails.shippingRate}</span>
        </p>
        <DataTable
          columns={columns}
          data={orderDetails.products}
          searchKey="product"
        />
      </div>
    );
  } catch (error) {
    console.error("Failed to load order details:", error);
    return (
      <div className="flex flex-col p-10 gap-5">
        <p className="text-base-bold">
          Failed to load order details. Please try again later.
        </p>
      </div>
    );
  }
};

export default OrderDetails;
