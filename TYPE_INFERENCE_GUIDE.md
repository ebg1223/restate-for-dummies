# Type Inference Guide

This guide explains how to properly use TypeScript type inference with restate-for-dummies.

## The Challenge

TypeScript has a limitation with partial type parameter inference. When defining an object handler with state, you need to specify both the State type and the Handlers type. If you only specify the State type, TypeScript cannot properly infer the handler methods.

## Solutions

### Solution 1: Use the Builder API (Recommended)

The builder API separates state type specification from handler definition, allowing TypeScript to infer handler types properly:

```typescript
const counter = restate.objectWithState<CounterState>("Counter").handlers({
  increment: async ({ getState, setState }) => {
    const count = (await getState("count")) ?? 0;
    await setState("count", count + 1);
    return count + 1;
  },
  decrement: async ({ getState, setState }) => {
    const count = (await getState("count")) ?? 0;
    await setState("count", count - 1);
    return count - 1;
  },
});

// The client will have properly typed increment() and decrement() methods
const service = restate.service("MyService", {
  useCounter: async ({ object }) => {
    const client = object(counter, "main");
    const result = await client.increment(); // ✅ TypeScript knows about increment()
    return result;
  },
});
```

### Solution 2: Specify Both Type Parameters

If you prefer the direct API, you need to specify both the State and Handlers type parameters:

```typescript
type CounterHandlers = {
  increment: (ctx: ObjectHandlerContext<CounterState>) => Promise<number>;
  decrement: (ctx: ObjectHandlerContext<CounterState>) => Promise<number>;
};

const counter = restate.object<CounterState, CounterHandlers>("Counter", {
  increment: async ({ getState, setState }) => {
    const count = (await getState("count")) ?? 0;
    await setState("count", count + 1);
    return count + 1;
  },
  decrement: async ({ getState, setState }) => {
    const count = (await getState("count")) ?? 0;
    await setState("count", count - 1);
    return count - 1;
  },
});
```

## Why This Happens

When you write:
```typescript
restate.object<CounterState>("Counter", { ... })
```

TypeScript tries to infer the second type parameter (Handlers) from the constraint that depends on the first type parameter (State). This creates a circular dependency that TypeScript cannot resolve, causing it to default to a generic `Record<string, ...>` type that loses the specific method names.

## Best Practices

1. **Use the builder API** (`objectWithState`) for new code - it provides the best developer experience
2. **Keep handler definitions close to the object definition** to make the types clear
3. **Consider extracting complex handler types** into separate type definitions for reusability

## Example Migration

From:
```typescript
const myObject = restate.object<MyState>("MyObject", {
  myMethod: async ({ getState }) => { ... }
});
// ❌ client.myMethod() will not be recognized
```

To:
```typescript
const myObject = restate.objectWithState<MyState>("MyObject").handlers({
  myMethod: async ({ getState }) => { ... }
});
// ✅ client.myMethod() is properly typed
```