# Restate-for-Dummies Implementation Plan

## Overview
Transform the current restate abstraction into a redistributable library with a clean factory pattern that allows users to configure serialization (serde) and other settings once, then use fully type-safe functions throughout their application.

## Current State Analysis

### Existing Components
1. **Typed Primitives** (`primitives/` directory)
   - `typed-service.ts` - Service wrapper with context destructuring
   - `typed-object.ts` - Virtual object wrapper with state management
   - `typed-workflow.ts` - Workflow wrapper with run/shared handlers
   - `client-wrapper.ts` - Client creation with serde injection
   - `client-proxy.ts` - Proxy-based serde injection for clients
   - `standalone-clients.ts` - Clients for use outside Restate contexts

2. **Issues Identified**
   - Missing `serde.ts` file (SuperJsonSerde implementation)
   - Undefined `SerdeOption` type in `utils.ts`
   - Reference to undefined `superjsonserde` variable
   - Inconsistent serde configuration across components
   - No unified initialization/factory pattern

## Proposed Architecture

### Core Factory Pattern
```typescript
// Single initialization point for users
const restate = createRestateFactory({
  defaultSerde: new SuperJsonSerde(),
  // Future options: logging, middleware, etc.
});

// All subsequent usage inherits configuration
const service = restate.service('MyService', handlers);
const object = restate.object('MyObject', handlers);
const workflow = restate.workflow('MyWorkflow', { run, shared });
```

### Benefits
1. **Consistency**: Single serde configuration used everywhere
2. **Type Safety**: Full TypeScript support with proper inference
3. **Simplicity**: Clean API with minimal boilerplate
4. **Extensibility**: Easy to add new configuration options

### Critical Type Safety Requirements
- **Preserved Type Inference**: All handler arguments and return types must be fully inferred
- **Type-Safe Clients**: Client methods must maintain exact type signatures from service definitions
- **Cross-Service Type Safety**: When passing services/objects between handlers, types flow correctly
- **No Type Erasure**: Factory pattern must not introduce any `any` types or lose type information

## Implementation Steps

### Phase 1: Fix Missing Components
1. **Create `serde.ts`**
   - Implement `SuperJsonSerde` class extending `restate.Serde`
   - Add `JsonSerde` as a pass-through option
   - Export serde types and implementations

2. **Create `types.ts`**
   - Define `SerdeOption<T>` type
   - Define `FactoryConfig` interface
   - Define `RestateFactory` return type
   - Add any other missing type definitions

3. **Fix `utils.ts`**
   - Import `SuperJsonSerde` from new serde file
   - Update `resolveSerde` function to handle proper imports
   - Fix undefined `superjsonserde` reference

### Phase 2: Create Factory System
1. **Create `factory.ts`**
   - Main `createRestateFactory` function
   - Store configuration in closure
   - Return object with configured primitive creators

2. **Update Primitive Creators**
   - Modify to accept factory configuration
   - Use factory's default serde unless overridden
   - Maintain backward compatibility where possible

3. **Update Client Wrappers**
   - Pass factory serde to all client creation functions
   - Update proxy wrappers to use factory defaults

### Phase 3: Refactor for Consistency
1. **Standardize Handler Contexts**
   - Ensure all contexts follow same pattern
   - Consistent client method signatures
   - Unified state management interface

2. **Consolidate Client Creation**
   - Single pattern for all client types
   - Consistent serde injection
   - Remove duplication

### Phase 4: Polish and Package
1. **Update Main Exports**
   - Clean `index.ts` with factory as primary export
   - Export types for user convenience
   - Export serde implementations

2. **Create Examples**
   - Basic service example
   - Object with state management
   - Workflow with orchestration
   - Cross-primitive communication

3. **Documentation**
   - API reference
   - Migration guide from current pattern
   - Best practices

## Detailed File Changes

### New Files to Create
1. `serde.ts` - Serde implementations
2. `types.ts` - Type definitions
3. `factory.ts` - Main factory implementation
4. `examples/` directory with usage examples

### Files to Modify
1. `utils.ts` - Fix serde references
2. `typed-service.ts` - Accept factory config
3. `typed-object.ts` - Accept factory config
4. `typed-workflow.ts` - Accept factory config
5. `client-wrapper.ts` - Use factory serde
6. `standalone-clients.ts` - Use factory serde
7. `index.ts` - New exports structure

## API Design

### Factory Creation
```typescript
import { createRestateFactory, SuperJsonSerde } from 'restate-for-dummies';

const restate = createRestateFactory({
  defaultSerde: new SuperJsonSerde(),
  // Optional future additions:
  // middleware: [],
  // logging: { level: 'info' },
  // errorHandler: (err) => { ... }
});
```

### Service Definition with Full Type Safety
```typescript
// Define service with explicit handler types
const greetingService = restate.service('GreetingService', {
  greet: async ({ ctx, runStep }, name: string): Promise<string> => {
    const timestamp = await runStep('getTime', async () => Date.now());
    return `Hello ${name} at ${timestamp}`;
  },
  
  greetMany: async ({ ctx, service }, names: string[]): Promise<string[]> => {
    // Type-safe client calls with automatic serde
    // service() returns fully typed client where greet() signature is preserved
    const results = await Promise.all(
      names.map(name => service(greetingService).greet(name))
    );
    return results;
  },
  
  // Demonstrate passing typed services between handlers
  processWithCounter: async ({ ctx, object }, data: string): Promise<number> => {
    // object() returns fully typed client for counter object
    const counterClient = object(counter, 'main');
    // increment() method is fully typed from counter definition
    const newCount = await counterClient.increment();
    return newCount;
  }
});

// Type extraction works correctly
type GreetingService = typeof greetingService;
// Client type is automatically inferred with all methods
type GreetingClient = restate.ClientType<GreetingService>;
```

### Object Definition with Type-Safe State and Methods
```typescript
interface CounterState {
  count: number;
  lastUpdated: Date;
}

const counter = restate.object<CounterState>('Counter', {
  increment: async ({ ctx, get, set }): Promise<number> => {
    // get() and set() are fully typed based on CounterState
    const current = await get('count') ?? 0;
    await set('count', current + 1);
    await set('lastUpdated', new Date());
    return current + 1;
  },
  
  getCount: async ({ get }): Promise<number> => {
    return await get('count') ?? 0;
  },
  
  // Demonstrate cross-service type safety
  incrementAndNotify: async ({ ctx, get, set, service }, serviceDef: typeof greetingService): Promise<string> => {
    const newCount = await get('count') ?? 0;
    await set('count', newCount + 1);
    
    // Client is fully typed based on passed service definition
    const client = service(serviceDef);
    // greet() method signature is preserved
    return await client.greet(`Counter is now ${newCount + 1}`);
  }
});

// Object client type is automatically inferred
type CounterClient = restate.ObjectClientType<typeof counter>;
// Methods like increment(), getCount() are fully typed

### Workflow Definition
```typescript
const orderWorkflow = restate.workflow('OrderWorkflow', {
  run: async ({ ctx, runStep, object }) => {
    const orderId = ctx.key;
    
    // Workflow logic with automatic serde
    const inventory = await runStep('checkInventory', async () => {
      return object(inventoryObject, 'main').check(orderId);
    });
    
    if (inventory.available) {
      await runStep('processPayment', async () => {
        // Payment logic
      });
    }
    
    return { orderId, status: 'completed' };
  },
  
  shared: {
    getStatus: async ({ ctx }) => {
      // Shared handler logic
    }
  }
});
```

### Standalone Clients with Full Type Safety
```typescript
// Outside Restate context
const clients = restate.standaloneClients('http://localhost:9080');

// Service client is fully typed based on service definition
const greetingClient = clients.service(greetingService);
// greet() has correct signature: (name: string) => Promise<string>
const result: string = await greetingClient.greet('World');

// Object client is fully typed
const counterClient = clients.object(counter, 'main');
// All methods have correct signatures
const count: number = await counterClient.increment();
const current: number = await counterClient.getCount();

// Send clients for delayed execution
const greetingSend = clients.serviceSend(greetingService);
// Type-safe delayed invocation
await greetingSend.greet('Future').send({ delay: 60 });
```

### Type Safety Implementation Details

The factory must ensure:

1. **Handler Type Preservation**
   ```typescript
   // Input handler type
   type Handler = (ctx: ServiceHandlerContext, name: string) => Promise<string>
   
   // Must transform to Restate's expected type while preserving args/return
   type RestateHandler = (ctx: restate.Context, name: string) => Promise<string>
   ```

2. **Client Method Inference**
   ```typescript
   // From service definition
   const service = restate.service('Service', {
     method: async (ctx, arg: CustomType): Promise<ResultType> => {...}
   });
   
   // Client must infer
   type Client = {
     method(arg: CustomType): Promise<ResultType>
   }
   ```

3. **Cross-Service Type Flow**
   ```typescript
   // When passing services between handlers
   const handler = async ({ service }, targetService: typeof someService) => {
     const client = service(targetService); // Must return correctly typed client
     const result = await client.someMethod(arg); // Full type checking
   };
   ```

## Testing Strategy
1. Unit tests for each component
2. Integration tests for factory pattern
3. E2E tests with actual Restate runtime
4. **Type safety tests (compile-time checks)**
   - Ensure handler types are preserved
   - Verify client method signatures match handlers
   - Test cross-service type inference
   - Validate no `any` types leak through
   - Check generic type constraints work correctly

## Migration Path
For users currently using the abstraction:
1. Install new version
2. Create factory with desired serde
3. Replace individual primitive imports with factory methods
4. Remove manual serde passing
5. Update any custom client creation

## Success Criteria
1. All existing functionality maintained
2. Cleaner, more intuitive API
3. Consistent serde usage across all components
4. Full type safety preserved
5. Easy to extend with new features
6. Well-documented and tested

## Future Enhancements
1. Middleware support for cross-cutting concerns
2. Built-in logging configuration
3. Error handling strategies
4. Metrics and observability hooks
5. Plugin system for extensions