// Primary export - Factory pattern
export { createRestateFactory } from "./factory";

// Export helper utilities for better type inference
export { objectHandlers, type InferObjectHandlers } from "./object-helpers";

// Export types
export type {
  Serde,
  FactoryConfig,
  RestateFactory,
  ClientType,
  ObjectClientType,
  WorkflowClientType,
} from "./types";

// Export handler context types for users who need them
export type { ServiceHandlerContext } from "./typed-service";
export type { HandlerContext as ObjectHandlerContext } from "./typed-object";
export type {
  WorkflowHandlerContext,
  WorkflowSharedHandlerContext,
} from "./typed-workflow";

// Export common types if users need them
export type {
  TypedService,
  TypedObject,
  TypedWorkflow,
  ExtractHandlerType,
  ExtractObjectStateType,
} from "./common-types";

// Export utility functions if users need them directly
export {
  run,
  get,
  set,
  type BaseOpts,
  type RunOpts,
  type GetContext,
  type SetContext,
} from "./utils";

// For backwards compatibility - Export the original functions
// Users can still use these directly if they want to manage serde themselves
export { createRestateService, typedService } from "./typed-service";
export { createRestateObject, typedObject } from "./typed-object";
export { createRestateWorkflow, typedWorkflow } from "./typed-workflow";

// Export client creation functions for advanced users
export {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createServiceSendClient,
  createWorkflowClient,
  createWorkflowSendClient,
} from "./client-wrapper";

// Export standalone client functions for advanced users
export {
  createObjectClient as createStandaloneObjectClient,
  createObjectSendClient as createStandaloneObjectSendClient,
  createServiceClient as createStandaloneServiceClient,
  createServiceSendClient as createStandaloneServiceSendClient,
  createWorkflowClient as createStandaloneWorkflowClient,
  createWorkflowSendClient as createStandaloneWorkflowSendClient,
} from "./standalone-clients";