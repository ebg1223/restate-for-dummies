// Export typed client utilities for use within Restate contexts
export {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createServiceSendClient,
  createWorkflowClient,
  createWorkflowSendClient,
} from "./client-wrapper";

// Export standalone typed client utilities for use outside Restate contexts
export {
  createObjectClient as standaloneObjectClient,
  createObjectSendClient as standaloneObjectSendClient,
  createServiceClient as standaloneServiceClient,
  createServiceSendClient as standaloneServiceSendClient,
  createWorkflowClient as standaloneWorkflowClient,
  createWorkflowSendClient as standaloneWorkflowSendClient,
} from "./standalone-clients";

// Export typed restate utilities
export {
  createRestateObject,
  type HandlerContext,
  typedObject,
} from "./typed-object";

export {
  createRestateService,
  type ServiceHandlerContext,
  typedService,
} from "./typed-service";

export {
  createRestateWorkflow,
  typedWorkflow,
  type WorkflowHandlerContext,
  type WorkflowSharedHandlerContext,
} from "./typed-workflow";
