const { createEventHandler } = new RestateClient({});

// Example 1: Basic event sourcing
type OrderEvents = {
  created: { orderId: string; customerId: string; amount: number };
  paid: { paymentId: string; paidAt: number };
  shipped: { trackingNumber: string; carrier: string };
  cancelled: { reason: string; refundAmount: number };
};

export const orderEventsObject = createEventHandler<OrderEvents>("OrderEvents")(
  {
    created: async (context, data) => {
      console.log(
        `Order ${data.orderId} created for customer ${data.customerId}`,
      );
      // Event is automatically appended to state
    },
    paid: async (context, data) => {
      console.log(`Payment ${data.paymentId} received`);
    },
    shipped: async (context, data) => {
      const events = await context.getState("events");

      console.log(`Order shipped with tracking ${data.trackingNumber}`);
    },
    cancelled: async (context, data) => {
      console.log(`Order cancelled: ${data.reason}`);
    },
  },
);

// Example 2: Event sourcing with additional state
type UserEvents = {
  registered: { email: string; name: string };
  profileUpdated: { changes: Record<string, any> };
  passwordChanged: { changedAt: number };
  accountDeleted: { deletedBy: string };
};

type UserAdditionalState = {
  isActive: boolean;
  lastLoginAt: number;
  metadata: {
    source: string;
    referrer?: string;
  };
};

export const userEventsObject = createEventHandler<
  UserEvents,
  UserAdditionalState
>("UserEvents")({
  registered: async (context, data) => {
    // Access both event state and additional state
    context.setState("isActive", true);
    context.setState("metadata", { source: "web" });

    // Can read the automatically maintained events list
    const events = await context.getState("events");
    console.log(`Total events: ${events?.length || 0}`);
  },
  profileUpdated: async (context, data) => {
    // Process profile updates
    //
    const isActive = await context.getState("isActive");
    if (!isActive) {
      throw new Error("Cannot update inactive profile");
    }
  },
  passwordChanged: async (context, data) => {
    context.setState("lastLoginAt", await context.ctx.date.now());
  },
  accountDeleted: async (context, data) => {
    context.setState("isActive", false);
  },
});

// Example 3: Using the inferred types
import {
  type InferEventType,
  type InferCombinedState,
  RestateClient,
} from "../src";

// These types are automatically inferred:
type OrderEvent = InferEventType<OrderEvents>;
type UserState = InferCombinedState<UserEvents, UserAdditionalState>;

// You can use these types in your application:
function processOrderEvent(event: OrderEvent) {
  switch (event.event) {
    case "created":
      console.log(`New order: ${event.data.orderId}`);
      break;
    case "paid":
      console.log(`Payment received: ${event.data.paymentId}`);
      break;
    // TypeScript ensures all cases are handled
  }
}
