// Main factory function
export { getRestate } from "./factory";

// Individual typed constructors for direct use
export { typedService, createRestateService } from "./typed-service";
export { typedObject, createRestateObject } from "./typed-object";
export { typedWorkflow, createRestateWorkflow } from "./typed-workflow";

// Type exports for advanced users
export type {
  ServiceHandlerContext,
  TransformHandlers as TransformServiceHandlers,
} from "./typed-service";

export type {
  HandlerContext as ObjectHandlerContext,
} from "./typed-object";

export type {
  WorkflowHandlerContext,
  WorkflowSharedHandlerContext,
} from "./typed-workflow";

export type {
  TypedRun,
  TypedGet,
  TypedSet,
  TypedClear,
  BaseClientMethods,
} from "./common-types";

// Standalone client utilities
export {
  createServiceClient,
  createServiceSendClient,
  createObjectClient,
  createObjectSendClient,
  createWorkflowClient,
  createWorkflowSendClient,
  getRestateClient,
} from "./standalone-clients";

// Re-export types from Restate SDK for convenience
export type {
  Serde,
  ServiceDefinition,
  VirtualObjectDefinition,
  WorkflowDefinition,
  Context,
  ObjectContext,
  WorkflowContext,
  WorkflowSharedContext,
} from "@restatedev/restate-sdk";