// Main API - RestateClient class
export { RestateClient } from "./factory";

// Individual typed constructors for direct use
export { typedService, createRestateService } from "./typed-service";
export { typedObject, createRestateObject } from "./typed-object";
export { typedWorkflow, createRestateWorkflow } from "./typed-workflow";
export { createEventObject } from "./typed-event-object";

// Type exports for advanced users
export type { ServiceHandlerContext } from "./typed-service";

export type { ObjectHandlerContext, HandlerContext } from "./typed-object";

export type {
  WorkflowHandlerContext,
  WorkflowSharedHandlerContext,
} from "./typed-workflow";

export type {
  EventUnion,
  EventSourcedState,
  CombinedEventState,
  InferEventType,
  InferEventState,
  InferCombinedState,
} from "./typed-event-object";

export type {
  TypedRun,
  TypedGet,
  TypedSet,
  TypedClear,
  BaseClientMethods,
  TransformObjectHandler,
  TransformServiceHandler,
  TransformWorkflowHandler,
  TransformWorkflowSharedHandler,
  BaseHandler,
  HandlerCollection,
} from "./common-types";

// Utility type exports
export type {
  SerdeOption,
  BaseOpts,
  SetContext,
  GetContext,
  RunFunc,
  RunOpts,
} from "./utils";

// Standalone client utilities
export {
  createServiceClient,
  createServiceSendClient,
  createObjectClient,
  createObjectSendClient,
  createWorkflowClient,
  createWorkflowSendClient,
} from "./standalone-clients";

// Export client wrapper types and functions
export {
  wrapClient,
  wrapSendClient,
  wrapIngressClient,
  wrapIngressSendClient,
  wrapIngressWorkflowClient,
} from "./client-proxy";

// Export client wrapper creation functions
export {
  createServiceClient as createWrappedServiceClient,
  createServiceSendClient as createWrappedServiceSendClient,
  createObjectClient as createWrappedObjectClient,
  createObjectSendClient as createWrappedObjectSendClient,
  createWorkflowClient as createWrappedWorkflowClient,
  createWorkflowSendClient as createWrappedWorkflowSendClient,
} from "./client-wrapper";

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

export * as restate from "@restatedev/restate-sdk";
export * as restateClients from "@restatedev/restate-sdk-clients";
export * as restateFetch from "@restatedev/restate-sdk/fetch";
export * as restateLambda from "@restatedev/restate-sdk/lambda";
