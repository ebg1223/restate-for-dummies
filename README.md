# Restate-for-Dummies

A type-safe, factory-based abstraction layer for [Restate](https://restate.dev) that simplifies service creation and serialization management.

## Overview

This library provides a clean factory pattern that allows you to:
- Configure serialization (serde) once and use it everywhere
- Create fully type-safe services, objects, and workflows
- Maintain type safety across service boundaries
- Use any serialization format you want (JSON, SuperJSON, MessagePack, etc.)

## Installation

```bash
bun add restate-for-dummies
```

## Quick Start

```typescript
import { RestateClient } from "restate-for-dummies";
import { SuperJsonSerde } from "./my-serde"; // Your custom serde class

// 1. Create a Restate client instance
const restate = new RestateClient({
  SerdeClass: SuperJsonSerde, // Pass the class constructor, not an instance
  restateUrl: "http://localhost:8080" // optional, defaults to RESTATE_URL env var
});

// 2. Define your service
const greetingService = restate.createService("GreetingService")({
  greet: async ({ ctx }, name: string) => {
    return `Hello, ${name}!`;
  },
});

// 3. Use client methods (with automatic serde)
const workflowClient = restate.workflowClient(myWorkflow, "workflow-key");
await workflowClient.workflowSubmit({ data: "test" });

const serviceClient = restate.serviceClient(myService);
await serviceClient.myMethod();

// 4. Export for registration
export { greetingService };
```

## Core Concepts

### The RestateClient Pattern

The `RestateClient` class is the centerpiece of this library. Instead of manually passing serde configurations to each primitive, you configure it once:

```typescript
const restate = new RestateClient({
  SerdeClass: MySerdeClass, // Pass the class constructor
  restateUrl: "http://localhost:8080" // optional
});
```

All primitives created from this client will automatically use your configured serde.

### Serde Interface

The `Serde` interface matches Restate SDK's requirements:

```typescript
interface Serde<T> {
  contentType?: string;
  serialize(value: T): Uint8Array;
  deserialize(bytes: Uint8Array): T;
}
```

### Type Safety

The library preserves full type safety throughout:

```typescript
// Define a service
const userService = restate.createService("UserService")({
  getUser: async ({ ctx }, id: string): Promise<User> => {
    // Return type is enforced
    return { id, name: "John" };
  },
});

// Use in another service - fully typed!
const orderService = restate.createService("OrderService")({
  createOrder: async ({ service }, userId: string) => {
    // user is typed as User
    const user = await service(userService).getUser(userId);
    return { userId: user.id, userName: user.name };
  },
});
```

## API Reference

### Client Creation

```typescript
const restate = new RestateClient({
  SerdeClass?: new () => Serde<any>, // Optional, defaults to JsonSerde
  restateUrl?: string // Optional, defaults to RESTATE_URL env var or "http://localhost:8080"
});
```

### Service Definition

```typescript
const service = restate.createService(name: string)(handlers: {
  [methodName: string]: (context, ...args) => Promise<result>
});
```

Context provides:
- `ctx`: Raw Restate context
- `runStep`: Type-safe step execution
- `service`: Create service clients
- `serviceSend`: Create delayed service clients
- `object`: Create object clients
- `objectSend`: Create delayed object clients
- `workflow`: Create workflow clients
- `workflowSend`: Create delayed workflow clients

### Object Definition

```typescript
// Define an object with typed state
const object = restate.createObject<State>(name: string)({
  [methodName: string]: (context, ...args) => Promise<result>
});
```

Context provides:
- `ctx`: Raw Restate context (ObjectContext)
- `getState`: Type-safe state getter
- `setState`: Type-safe state setter
- `clearState`: Clear state keys
- `runStep`: Type-safe step execution
- Plus all client creation methods (service, serviceSend, object, objectSend, workflow, workflowSend)

### Workflow Definition

```typescript
const workflow = restate.createWorkflow<State>(name: string)({
  run: async (context, ...args) => { /* main workflow */ },
  // Shared handlers are defined at the top level alongside run
  sharedMethod1: async (context, ...args) => { /* shared handler 1 */ },
  sharedMethod2: async (context, ...args) => { /* shared handler 2 */ },
});
```

Context for `run` handler provides:
- `ctx`: Raw Restate context (WorkflowContext)
- `getState`: Type-safe state getter
- `setState`: Type-safe state setter
- `clearState`: Clear state keys
- `runStep`: Type-safe step execution
- Plus all client creation methods

Context for shared handlers provides:
- `ctx`: Raw Restate context (WorkflowSharedContext)
- `getState`: Type-safe state getter (read-only access)
- `runStep`: Type-safe step execution
- Plus all client creation methods

### Client Methods

For use outside Restate contexts, use the client methods directly on the RestateClient instance:

```typescript
// Service client
const userClient = restate.serviceClient(userService);
const user = await userClient.getUser("123");

// Object client  
const counterClient = restate.objectClient(counter, "main");
const count = await counterClient.increment();

// Workflow client - use submit/attach pattern
const workflowClient = restate.workflowClient(myWorkflow, "instance-id");
await workflowClient.workflowSubmit();
const result = await workflowClient.workflowAttach();

// Send clients for delayed execution
const serviceSend = restate.serviceSendClient(userService);
const objectSend = restate.objectSendClient(counter, "main");
const workflowSend = restate.workflowSendClient(myWorkflow, "instance-id");
```

## Examples

### Using SuperJSON

```typescript
import superjson from "superjson";

class SuperJSONSerde implements Serde<any> {
  contentType = "application/json";
  
  serialize(value: any): Uint8Array {
    return new TextEncoder().encode(superjson.stringify(value));
  }
  
  deserialize(bytes: Uint8Array): any {
    return superjson.parse(new TextDecoder().decode(bytes));
  }
}

const restate = new RestateClient({
  SerdeClass: SuperJSONSerde,
});

// Now you can use Date, Set, Map, BigInt, etc.
const service = restate.createService("DateService")({
  getNextWeek: async ({ ctx }) => {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  },
});
```

### Cross-Service Communication

```typescript
const userService = restate.createService("UserService")({
  getUser: async ({ ctx }, id: string) => ({ id, name: "John" }),
});

const orderService = restate.createService("OrderService")({
  createOrder: async ({ service }, userId: string) => {
    // Type-safe cross-service call
    const user = await service(userService).getUser(userId);
    return { userId: user.id, userName: user.name };
  },
});
```

### State Management

```typescript
interface CounterState {
  count: number;
  lastUpdated: Date;
}

const counter = restate.createObject<CounterState>("Counter")({
  increment: async ({ getState, setState }) => {
    const count = (await getState("count")) ?? 0;
    await setState("count", count + 1);
    await setState("lastUpdated", new Date());
    return count + 1;
  },
});
```

## Migration from Direct SDK Usage

If you're currently using the Restate SDK directly:

1. Implement a Serde class that matches your current serialization
2. Create a RestateClient instance with your SerdeClass
3. Replace `restate.service()` with `client.createService(name)(handlers)`
4. Replace `restate.object()` with `client.createObject<State>(name)(handlers)`
5. Replace `restate.workflow()` with `client.createWorkflow<State>(name)(handlers)`
6. Update client creation to use the client methods

## Advanced Usage

### Custom Serde with Compression

```typescript
import { compress, decompress } from "lz4js";

class CompressedJSONSerde implements Serde<any> {
  contentType = "application/octet-stream";
  
  serialize(value: any): Uint8Array {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    return compress(bytes);
  }
  
  deserialize(bytes: Uint8Array): any {
    const decompressed = decompress(bytes);
    const json = new TextDecoder().decode(decompressed);
    return JSON.parse(json);
  }
}
```

### Type-Safe Handler Extraction

```typescript
const myService = restate.createService("MyService")({
  method1: async ({ ctx }, arg: string) => arg.length,
  method2: async ({ ctx }, arg: number) => arg * 2,
});

// The service definition is already properly typed
// When used with serviceClient(), you get full type safety
```

## Alternative API - Standalone Functions

In addition to the `RestateClient` class, the library also exports standalone typed functions that can be used directly:

```typescript
import { typedService, typedObject, typedWorkflow } from "restate-for-dummies";
import { SuperJsonSerde } from "./my-serde";

// Create a service directly
const myService = typedService("MyService", SuperJsonSerde)({
  myMethod: async ({ ctx }, arg: string) => {
    return `Hello ${arg}`;
  },
});

// Create an object directly
const myObject = typedObject<MyState>("MyObject", SuperJsonSerde)({
  getCount: async ({ getState }) => {
    return await getState("count") ?? 0;
  },
});

// Create a workflow directly
const myWorkflow = typedWorkflow<MyState>("MyWorkflow", SuperJsonSerde)({
  run: async ({ ctx, setState }, input: string) => {
    await setState("status", "running");
    return `Completed: ${input}`;
  },
});
```

These functions are useful when you want to create individual components without instantiating a `RestateClient`.

## License

MIT