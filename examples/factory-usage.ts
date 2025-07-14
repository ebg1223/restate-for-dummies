import {
  createRestateFactory,
  type Serde,
} from "../primitives";
import { rpc } from "@restatedev/restate-sdk-clients";

/**
 * Example: Basic JSON Serde Implementation
 * This is a simple pass-through serde that uses JSON.stringify/parse
 */
class JsonSerde implements Serde<any> {
  contentType = "application/json";

  serialize(value: any): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(value));
  }

  deserialize(bytes: Uint8Array): any {
    return JSON.parse(new TextDecoder().decode(bytes));
  }
}

/**
 * Example: SuperJSON-like Serde Implementation
 * This demonstrates how you might implement a serde that handles
 * JavaScript types that JSON doesn't support natively
 */
class SuperJsonSerde implements Serde<any> {
  contentType = "application/json";

  serialize(value: any): Uint8Array {
    // Handle special types
    const serialized = this.replacer(value);
    return new TextEncoder().encode(JSON.stringify(serialized));
  }

  deserialize(bytes: Uint8Array): any {
    const json = JSON.parse(new TextDecoder().decode(bytes));
    return this.reviver(json);
  }

  private replacer(value: any): any {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    if (value instanceof Set) {
      return { __type: "Set", value: Array.from(value) };
    }
    if (value instanceof Map) {
      return { __type: "Map", value: Array.from(value.entries()) };
    }
    if (typeof value === "bigint") {
      return { __type: "BigInt", value: value.toString() };
    }
    if (value instanceof RegExp) {
      return { __type: "RegExp", source: value.source, flags: value.flags };
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.replacer(v));
    }
    if (value && typeof value === "object") {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.replacer(v);
      }
      return result;
    }
    return value;
  }

  private reviver(value: any): any {
    if (value && typeof value === "object" && "__type" in value) {
      switch (value.__type) {
        case "Date":
          return new Date(value.value);
        case "Set":
          return new Set(value.value);
        case "Map":
          return new Map(value.value);
        case "BigInt":
          return BigInt(value.value);
        case "RegExp":
          return new RegExp(value.source, value.flags);
      }
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.reviver(v));
    }
    if (value && typeof value === "object") {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.reviver(v);
      }
      return result;
    }
    return value;
  }
}

// ========================================
// Usage Example
// ========================================

// 1. Create the factory with your chosen serde
const restate = createRestateFactory({
  serde: new SuperJsonSerde(), // or new JsonSerde() for simpler needs
});

// 2. Define a service with full type safety
interface User {
  id: string;
  name: string;
  createdAt: Date; // SuperJsonSerde handles Date serialization
  tags: Set<string>; // SuperJsonSerde handles Set serialization
}

const userService = restate.service("UserService", {
  createUser: async ({ ctx, runStep }, user: User) => {
    // The user object is automatically serialized/deserialized
    const userId = await runStep("generateId", async () => {
      return `user_${Date.now()}`;
    });

    const enrichedUser = {
      ...user,
      id: userId,
    };

    console.log("Creating user:", enrichedUser);
    return enrichedUser;
  },

  getUser: async ({ ctx, runStep }, userId: string): Promise<User | null> => {
    // Simulate fetching user
    return {
      id: userId,
      name: "John Doe",
      createdAt: new Date(),
      tags: new Set(["premium", "verified"]),
    };
  },
});

// 3. Define an object with state management
interface CounterState {
  count: number;
  lastUpdated: Date;
  history: Map<string, number>;
}

// Using the builder API for better type inference
const counter = restate.objectWithState<CounterState>("Counter").handlers({
  increment: async ({ getState, setState }) => {
    const currentCount = (await getState("count")) ?? 0;
    const newCount = currentCount + 1;

    await setState("count", newCount);
    await setState("lastUpdated", new Date());

    // Update history
    const history = (await getState("history")) ?? new Map();
    history.set(new Date().toISOString(), newCount);
    await setState("history", history);

    return newCount;
  },

  getStatus: async ({ getState }) => {
    const count = (await getState("count")) ?? 0;
    const lastUpdated = await getState("lastUpdated");
    const history = await getState("history");

    return {
      count,
      lastUpdated,
      historySize: history?.size ?? 0,
    };
  },

  // Cross-service communication
  notifyUser: async ({ service }, userId: string): Promise<boolean> => {
    // Create a separate user service client to avoid circular reference
    const userClient = service(userService);
    const user = await userClient.getUser(userId);
    if (user) {
      console.log(`Notifying user ${user.name}`);
    }
    return user !== null;
  },
});

// 4. Define a workflow
const orderWorkflow = restate.workflow("OrderWorkflow", {
  run: async ({ ctx, runStep, object, service }) => {
    const orderId = ctx.key;

    // Create clients first to help with type inference
    const counterClient = object(counter, "orders");
    const userClient = service(userService);

    // Increment order counter
    const orderNumber = await counterClient.increment();

    // Create order user
    const user = await userClient.createUser({
      id: "",
      name: `Order ${orderNumber}`,
      createdAt: new Date(),
      tags: new Set(["order"]),
    });

    return {
      orderId,
      orderNumber,
      userId: user.id,
      createdAt: user.createdAt,
    };
  },

  getOrderStatus: async ({ ctx }) => {
    return `Order ${ctx.key} is being processed`;
  },
});

// 5. Use standalone clients outside Restate contexts
async function externalSystemIntegration() {
  const clients = restate.standaloneClients("http://localhost:9080");

  // All clients automatically use the factory's serde
  const userClient = clients.service(userService);
  const user = await userClient.getUser("user_123");

  const counterClient = clients.object(counter, "main");
  const count = await counterClient.increment();

  const workflowClient = clients.workflow(orderWorkflow, "order_456");
  // Submit the workflow and wait for completion
  const submission = await workflowClient.workflowSubmit();
  const result = await workflowClient.workflowAttach();

  // Send delayed invocations
  const sendClient = clients.serviceSend(userService);
  await sendClient.createUser(
    {
      id: "",
      name: "Delayed User",
      createdAt: new Date(),
      tags: new Set(["scheduled"]),
    },
    rpc.sendOpts({ delay: 60000 }) // 1 minute delay
  );
}

// Export the definitions for use in your application
export { userService, counter, orderWorkflow };
