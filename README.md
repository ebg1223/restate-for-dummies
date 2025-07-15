# Restate-for-Dummies

Making [Restate](https://restate.dev) dead simple with automatic type safety, state management, and seamless service communication.

## What's the Problem?

Restate is powerful, but setting it up involves:
- Configuring serialization for every service, object, and workflow
- Managing type safety across service boundaries
- Manually creating clients with the right serde configuration
- Keeping track of which context methods are available where

This library removes all that complexity.

## Why Use This?

### 🎯 Type-Safe State Out of the Box
```typescript
// Your state is fully typed - no more guessing!
const counter = restate.createObject<{ count: number; lastUser: string }>("Counter")({
  increment: async ({ getState, setState }, userId: string) => {
    const count = (await getState("count")) ?? 0;  // ✨ TypeScript knows this is number | undefined
    await setState("count", count + 1);             // ✨ TypeScript enforces count is a number
    await setState("lastUser", userId);             // ✨ TypeScript enforces lastUser is a string
    return count + 1;
  }
});
```

### 🔗 Call Any Service/Object/Workflow Without Setup
```typescript
const orderService = restate.createService("OrderService")({
  createOrder: async ({ service, object }, userId: string, items: string[]) => {
    // Call other services - serde is handled automatically!
    const user = await service(userService).getUser(userId);

    // Call objects - same simple syntax
    const inventory = await object(inventoryObject, "main").checkStock(items);

    // Start workflows - still just works
    await workflow(fulfillmentWorkflow, orderId).workflowSubmit({ user, items });

    return { orderId, status: "created" };
  }
});
```

### 🚀 One Configuration, Use Everywhere
```typescript
// Configure once
const restate = new RestateClient({
  SerdeClass: SuperJsonSerde  // Now you can use Dates, Sets, Maps, etc everywhere!
});

// Everything created from this client uses your serde automatically
const service1 = restate.createService("Service1")({ /* ... */ });
const service2 = restate.createService("Service2")({ /* ... */ });
const object1 = restate.createObject<State>("Object1")({ /* ... */ });
```

## Quick Start

```bash
bun add restate-for-dummies
```

```typescript
import { RestateClient } from "restate-for-dummies";

// 1. Create your client (usually just once per app)
const restate = new RestateClient();

// 2. Define services with auto-typed context
const greetingService = restate.createService("GreetingService")({
  greet: async ({ ctx }, name: string) => {
    return `Hello, ${name}!`;
  },

  greetDelayed: async ({ ctx, serviceSend }, name: string, delayMs: number) => {
    // Schedule a delayed call to ourselves - serde handled automatically
    await serviceSend(greetingService).greet(name).send({ delay: delayMs });
    return "Scheduled!";
  }
});

// 3. Export for Restate runtime
export default greetingService;
```

## Core Concepts

### Services - Stateless Operations

Services are for business logic without persistent state:

```typescript
const emailService = restate.createService("EmailService")({
  sendWelcomeEmail: async ({ ctx, runStep }, userId: string) => {
    // Use runStep for reliable execution
    const user = await runStep("fetch-user", () => fetchUserFromDB(userId));
    const result = await runStep("send-email", () => sendEmail(user.email, "Welcome!"));
    return result;
  }
});
```

### Objects - Stateful Entities

Objects maintain state across calls:

```typescript
interface CartState {
  items: Array<{ id: string; quantity: number }>;
  userId?: string;
}

const shoppingCart = restate.createObject<CartState>("ShoppingCart")({
  addItem: async ({ getState, setState }, itemId: string, quantity: number) => {
    const items = (await getState("items")) ?? [];
    items.push({ id: itemId, quantity });
    await setState("items", items);
  },

  checkout: async ({ ctx, getState, clearState, workflow }) => {
    const items = await getState("items");
    if (!items?.length) throw new Error("Cart is empty");

    // Start a checkout workflow
    await workflow(checkoutWorkflow, ctx.key).workflowSubmit({ items });

    // Clear the cart
    await clearState("items");
  }
});
```

### Workflows - Long-Running Processes

Workflows handle complex, long-running operations:

```typescript
interface OrderState {
  status: "pending" | "paid" | "shipped" | "delivered";
  trackingNumber?: string;
}

const orderWorkflow = restate.createWorkflow<OrderState>("OrderWorkflow")({
  run: async ({ ctx, setState, runStep, object }, order: Order) => {
    await setState("status", "pending");

    // Wait for payment
    const payment = await ctx.promise<Payment>("payment");
    await setState("status", "paid");

    // Reserve inventory
    await runStep("reserve-inventory", async () => {
      await object(inventory, "main").reserve(order.items);
    });

    // Ship order
    const tracking = await runStep("ship", () => shipOrder(order));
    await setState("trackingNumber", tracking);
    await setState("status", "shipped");

    return tracking;
  },

  // Workflows can have additional handlers
  recordPayment: async ({ ctx }, payment: Payment) => {
    await ctx.resolvePromise("payment", payment);
  },

  getStatus: async ({ getState }) => {
    return {
      status: await getState("status"),
      trackingNumber: await getState("trackingNumber")
    };
  }
});
```

## The Magic: Every Handler Gets Everything

No more context confusion! Every handler automatically gets the right tools:

```typescript
const myService = restate.createService("MyService")({
  doEverything: async (context) => {
    // Every handler can:
    context.service(userService).getUser(id);      // ✅ Call any service
    context.object(cart, "cart-123").getItems();   // ✅ Call any object
    context.workflow(order, "order-456").getStatus(); // ✅ Call any workflow
    context.runStep("step", () => { /* ... */ });  // ✅ Use durable execution

    // Objects and workflows also get:
    context.getState("myKey");    // ✅ Type-safe state access
    context.setState("myKey", value); // ✅ Type-safe state updates
  }
});
```

## Using from Outside Restate

Need to call your services from a regular Node.js app? We've got you covered:

```typescript
// From your Express/Fastify/etc app:
const client = new RestateClient({ restateUrl: "http://localhost:8080" });

// Call services
const greeting = await client.serviceClient(greetingService).greet("World");

// Call objects
const items = await client.objectClient(shoppingCart, "user-123").getItems();

// Call workflows
const orderClient = client.workflowClient(orderWorkflow, "order-789");
await orderClient.workflowSubmit({ items, userId });
const status = await orderClient.getStatus();
```

## Custom Serialization

By default, only JSON-serializable types work. Want to use Dates, Sets, Maps, or custom classes? Just plug in your serde:

```typescript
import superjson from "superjson";

class SuperJsonSerde {
  contentType = "application/json";

  serialize(value: any): Uint8Array {
    return new TextEncoder().encode(superjson.stringify(value));
  }

  deserialize(bytes: Uint8Array): any {
    return superjson.parse(new TextDecoder().decode(bytes));
  }
}

// Now use rich types everywhere!
const restate = new RestateClient({ SerdeClass: SuperJsonSerde });

const dateService = restate.createService("DateService")({
  scheduleFor: async ({ ctx }, date: Date) => {  // ✅ Date objects work!
    return { scheduled: date, in: date.getTime() - Date.now() };
  }
});
```

## Before vs After

### Before (Raw Restate SDK):
```typescript
// Define serde
const serde = new SuperJsonSerde();

// Create service with manual serde config
const userService = restate.service({
  name: "UserService",
  handlers: {
    getUser: restate.handlers.handler({
      input: serde, output: serde
    }, async (ctx: Context, id: string) => {
      // Manually create client with serde
      const profileClient = ctx.serviceClient(profileService, { serde });
      const profile = await profileClient.getProfile(id);
      return { id, profile };
    })
  }
});
```

### After (With This Library):
```typescript
// Configure once
const restate = new RestateClient({ SerdeClass: SuperJsonSerde });

// Everything just works!
const userService = restate.createService("UserService")({
  getUser: async ({ service }, id: string) => {
    const profile = await service(profileService).getProfile(id);
    return { id, profile };
  }
});
```

## Installation

```bash
bun add restate-for-dummies
# or
npm install restate-for-dummies
```

## Complete Example

Here's a real-world example showing the power of this library:

```typescript
import { RestateClient } from "restate-for-dummies";
import { SuperJsonSerde } from "./serde";

const restate = new RestateClient({ SerdeClass: SuperJsonSerde });

// User service
const userService = restate.createService("UserService")({
  createUser: async ({ ctx, runStep }, email: string, name: string) => {
    const user = await runStep("create-in-db", () =>
      db.users.create({ email, name })
    );

    await runStep("send-welcome-email", () =>
      sendEmail(email, "Welcome!")
    );

    return user;
  }
});

// Shopping cart object with state
interface CartState {
  items: Map<string, number>;  // productId -> quantity
  coupon?: string;
}

const cartObject = restate.createObject<CartState>("Cart")({
  addItem: async ({ getState, setState }, productId: string, quantity: number) => {
    const items = (await getState("items")) ?? new Map();
    items.set(productId, (items.get(productId) ?? 0) + quantity);
    await setState("items", items);
  },

  applyCoupon: async ({ setState }, code: string) => {
    await setState("coupon", code);
  },

  checkout: async ({ ctx, getState, clearState, workflow }) => {
    const items = await getState("items");
    const coupon = await getState("coupon");

    if (!items?.size) throw new Error("Cart empty");

    // Start checkout workflow
    const orderId = `order-${Date.now()}`;
    await workflow(checkoutWorkflow, orderId).workflowSubmit({
      cartId: ctx.key,
      items: Array.from(items.entries()),
      coupon
    });

    // Clear cart
    await clearState("items");
    await clearState("coupon");

    return orderId;
  }
});

// Checkout workflow
const checkoutWorkflow = restate.createWorkflow<{
  status: string;
  paymentId?: string;
}>("CheckoutWorkflow")({
  run: async ({ ctx, setState, service, object }, input: CheckoutInput) => {
    await setState("status", "processing");

    // Calculate total
    const total = await service(pricingService).calculateTotal(
      input.items,
      input.coupon
    );

    // Process payment
    const paymentId = await ctx.promise<string>("payment-processed");
    await setState("paymentId", paymentId);
    await setState("status", "paid");

    // Update inventory
    for (const [productId, quantity] of input.items) {
      await object(inventoryObject, productId).reserve(quantity);
    }

    await setState("status", "completed");
    return { orderId: ctx.key, total, paymentId };
  },

  processPayment: async ({ ctx, getState }, paymentId: string) => {
    const status = await getState("status");
    if (status !== "processing") throw new Error("Invalid state");

    await ctx.resolvePromise("payment-processed", paymentId);
  }
});

// Export for Restate runtime
export const services = [userService];
export const objects = [cartObject];
export const workflows = [checkoutWorkflow];
```

## License

MIT
