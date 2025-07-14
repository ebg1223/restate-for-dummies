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
import { createRestateFactory, type Serde } from "restate-for-dummies/primitives";

// 1. Implement your serde
const jsonSerde: Serde<any> = {
  contentType: "application/json",
  serialize: (value) => new TextEncoder().encode(JSON.stringify(value)),
  deserialize: (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
};

// 2. Create the factory
const restate = createRestateFactory({ serde: jsonSerde });

// 3. Define your service
const greetingService = restate.service("GreetingService", {
  greet: async ({ ctx }, name: string) => {
    return `Hello, ${name}!`;
  },
});

// 4. Export for registration
export { greetingService };
```

## Core Concepts

### The Factory Pattern

The factory pattern is the centerpiece of this library. Instead of manually passing serde configurations to each primitive, you configure it once:

```typescript
const restate = createRestateFactory({
  serde: mySerde,
});
```

All primitives created from this factory will automatically use your configured serde.

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

The library preserves full type safety throughout. For objects with state, use the builder API (`objectWithState`) for the best type inference experience. See [TYPE_INFERENCE_GUIDE.md](./TYPE_INFERENCE_GUIDE.md) for details.

```typescript
// Define a service
const userService = restate.service("UserService", {
  getUser: async ({ ctx }, id: string): Promise<User> => {
    // Return type is enforced
    return { id, name: "John" };
  },
});

// Use in another service - fully typed!
const orderService = restate.service("OrderService", {
  createOrder: async ({ service }, userId: string) => {
    // user is typed as User
    const user = await service(userService).getUser(userId);
    return { userId: user.id, userName: user.name };
  },
});
```

## API Reference

### Factory Creation

```typescript
const restate = createRestateFactory(config: FactoryConfig);
```

### Service Definition

```typescript
const service = restate.service(name: string, handlers: {
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

### Object Definition

```typescript
// Using the builder API (recommended for better type inference)
const object = restate.objectWithState<State>(name: string).handlers({
  [methodName: string]: (context, ...args) => Promise<result>
});

// Or with explicit type parameters
const object = restate.object<State, Handlers>(name: string, handlers);
```

Context provides:
- `ctx`: Raw Restate context
- `getState`: Type-safe state getter
- `setState`: Type-safe state setter
- `clearState`: Clear state keys
- Plus all client creation methods

### Workflow Definition

```typescript
const workflow = restate.workflow(name: string, {
  run: async (context, ...args) => { /* main workflow */ },
  // Shared handlers are defined at the top level alongside run
  sharedMethod1: async (context, ...args) => { /* shared handler 1 */ },
  sharedMethod2: async (context, ...args) => { /* shared handler 2 */ },
});
```

### Standalone Clients

For use outside Restate contexts:

```typescript
const clients = restate.standaloneClients("http://localhost:9080");

const userClient = clients.service(userService);
const user = await userClient.getUser("123");

const counterClient = clients.object(counter, "main");
const count = await counterClient.increment();

// For workflows, use submit/attach pattern
const workflowClient = clients.workflow(myWorkflow, "instance-id");
await workflowClient.workflowSubmit();
const result = await workflowClient.workflowAttach();
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

const restate = createRestateFactory({
  serde: new SuperJSONSerde(),
});

// Now you can use Date, Set, Map, BigInt, etc.
const service = restate.service("DateService", {
  getNextWeek: async ({ ctx }) => {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  },
});
```

### Cross-Service Communication

```typescript
const userService = restate.service("UserService", {
  getUser: async ({ ctx }, id: string) => ({ id, name: "John" }),
});

const orderService = restate.service("OrderService", {
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

const counter = restate.objectWithState<CounterState>("Counter").handlers({
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

1. Implement a Serde that matches your current serialization
2. Create a factory with your serde
3. Replace `restate.service()` with `factory.service()`
4. Replace `restate.object()` with `factory.objectWithState().handlers()` or `factory.object()` with explicit types
5. Replace `restate.workflow()` with `factory.workflow()`
6. Update client creation to use the factory methods

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
import type { ClientType } from "restate-for-dummies/primitives";

const myService = restate.service("MyService", {
  method1: async ({ ctx }, arg: string) => arg.length,
  method2: async ({ ctx }, arg: number) => arg * 2,
});

// Extract client type
type MyServiceClient = ClientType<typeof myService>;
// MyServiceClient has methods: method1(arg: string): Promise<number>, etc.
```

## License

MIT