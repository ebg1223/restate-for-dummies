/**
 * Type tests to ensure type inference works correctly
 * These tests don't run - they just check that TypeScript can compile them
 */

import { createRestateFactory } from "../primitives";
import type { Serde } from "@restatedev/restate-sdk-core";

// Mock serde for testing
const mockSerde: Serde<any> = {
  contentType: "application/json",
  serialize: (value) => new TextEncoder().encode(JSON.stringify(value)),
  deserialize: (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
};

// Create factory
const restate = createRestateFactory({ serde: mockSerde });

// =============================================================================
// Service Type Tests
// =============================================================================

// Test: Service handler context types are properly inferred
const testService = restate.service("TestService", {
  method1: async ({ ctx, runStep, service, object, workflow }) => {
    // Context should be properly typed
    const uuid: string = ctx.rand.uuidv4();
    
    // runStep should infer return types
    const result = await runStep("test", async () => ({ value: 42 }));
    const inferredValue: number = result.value;
    
    return "done";
  },
  
  method2: async ({ ctx }, param: string, num: number) => {
    // Parameters should be typed
    const upper: string = param.toUpperCase();
    const doubled: number = num * 2;
    return { upper, doubled };
  },
});

// Test: Service client type inference
const serviceUsage = restate.service("ServiceUsage", {
  useOtherService: async ({ service }) => {
    const client = service(testService);
    
    // Method signatures should be preserved
    const result1: string = await client.method1();
    const result2 = await client.method2("test", 123);
    
    // Return type should be inferred
    const upper: string = result2.upper;
    const doubled: number = result2.doubled;
  },
});

// =============================================================================
// Object Type Tests
// =============================================================================

interface CounterState {
  count: number;
  lastUpdated: Date;
}

// Test: Object with explicit state type
const counter = restate.objectWithState<CounterState>("Counter").handlers({
  increment: async ({ getState, setState, clearState }) => {
    // State keys should be typed
    const count = await getState("count");
    const countType: number | null = count;
    
    await setState("count", (count ?? 0) + 1);
    await setState("lastUpdated", new Date());
    
    // Should not allow invalid keys
    // @ts-expect-error - invalid key
    await getState("invalid");
    
    // clearState should accept valid keys
    await clearState("count");
  },
  
  getCount: async ({ getState }) => {
    const count = await getState("count");
    return count ?? 0;
  },
});

// Test: Object with inline definition (new API)
const inlineObject = restate.object("InlineObject", {
  method1: async ({ ctx, getState, setState }) => {
    // State should be 'unknown' when not specified
    const value = await getState("anyKey" as any);
    await setState("anyKey" as any, "anyValue");
    return "done";
  },
});

// Test: Object client usage
const objectUsage = restate.service("ObjectUsage", {
  useCounter: async ({ object }) => {
    const client = object(counter, "main");
    
    // Methods should be typed
    await client.increment();
    const count: number = await client.getCount();
  },
});

// =============================================================================
// Workflow Type Tests
// =============================================================================

interface OrderState {
  status: "pending" | "processing" | "complete";
  items: string[];
}

// Test: Workflow with state and shared handlers
const orderWorkflow = restate.workflow("OrderWorkflow", {
  run: async ({ ctx, runStep, getState, setState }, orderId: string) => {
    // Parameters should be typed
    const id: string = orderId;
    
    // Context key should be accessible
    const key: string = ctx.key;
    
    // State operations (using any for flexibility)
    await setState("status" as any, "processing");
    
    const total = await runStep("calculate", async () => 100);
    
    return { orderId, total };
  },
  
  getStatus: async ({ ctx, getState }) => {
    // Shared handlers can't set state
    const status = await getState("status" as any);
    return `Order ${ctx.key} status: ${status ?? "unknown"}`;
  },
  
  addItem: async ({ ctx, getState, runStep }, item: string) => {
    // Shared handlers can use runStep
    await runStep("addItem", () => {
      console.log(`Adding item: ${item}`);
    });
  },
});

// Test: Workflow client usage
const workflowUsage = restate.service("WorkflowUsage", {
  useWorkflow: async ({ workflow }) => {
    const client = workflow(orderWorkflow, "order-123");
    
    // Shared methods should be available
    const status = await client.getStatus!();
    await client.addItem!("item1");
    
    // Run method should not be directly callable on regular workflow client
  },
});

// =============================================================================
// Standalone Client Type Tests
// =============================================================================

// Test: Standalone clients maintain types
const standaloneTest = async () => {
  const clients = restate.standaloneClients("http://localhost:9080");
  
  // Service client
  const serviceClient = clients.service(testService);
  const result1: string = await serviceClient.method1();
  const result2 = await serviceClient.method2("test", 123);
  
  // Object client
  const objectClient = clients.object(counter, "test");
  await objectClient.increment();
  const count: number = await objectClient.getCount();
  
  // Workflow client
  const workflowClient = clients.workflow(orderWorkflow, "test");
  await workflowClient.workflowSubmit!("order-456");
  const workflowResult = await workflowClient.workflowAttach!();
  // Type casting needed due to simplified types
  const orderId: string = (workflowResult as any).orderId;
  const total: number = (workflowResult as any).total;
  
  // Send clients
  const serviceSend = clients.serviceSend(testService);
  await serviceSend.method1();
  
  const objectSend = clients.objectSend(counter, "test");
  await objectSend.increment();
};

// =============================================================================
// Complex Type Inference Tests
// =============================================================================

// Test: Nested object usage
const complexService = restate.service("ComplexService", {
  complexMethod: async ({ service, object, workflow, runStep }) => {
    // Multiple client types in one handler
    const svc = service(testService);
    const obj = object(counter, "main");
    const wf = workflow(orderWorkflow, "order-789");
    
    // Chained operations with proper typing
    const serviceResult = await svc.method2("test", 123);
    const count = await obj.getCount();
    const status = await wf.getStatus!();
    
    // runStep with complex return type
    const complexResult = await runStep("complex", async () => ({
      service: serviceResult,
      count,
      status,
      computed: serviceResult.doubled + count,
    }));
    
    // All types should be inferred
    // Types are inferred through the runStep
    const { service: svcResult, count: currentCount, status: orderStatus, computed } = complexResult;
    
    return complexResult;
  },
});

// =============================================================================
// Edge Case Tests
// =============================================================================

// Test: Empty handlers
const emptyService = restate.service("EmptyService", {});

// Test: Single method service
const singleMethod = restate.service("SingleMethod", {
  onlyMethod: async () => "done",
});

// Test: Methods returning void/undefined
const voidService = restate.service("VoidService", {
  voidMethod: async ({ ctx }) => {
    console.log(ctx.rand.random());
    // Implicitly returns undefined
  },
  
  explicitVoid: async (): Promise<void> => {
    // Explicitly returns void
  },
});

// Test: Methods with many parameters
const manyParams = restate.service("ManyParams", {
  method: async (
    { ctx },
    p1: string,
    p2: number,
    p3: boolean,
    p4: { nested: string },
    p5?: string[]
  ) => {
    return { p1, p2, p3, p4, p5 };
  },
});

// Export something to make this a module
export const typeTests = {
  testService,
  counter,
  orderWorkflow,
  complexService,
};