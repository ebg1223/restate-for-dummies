import type {
  Serde,
  ServiceDefinition,
  VirtualObjectDefinition,
  WorkflowDefinition,
} from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk-clients";

import {
  wrapIngressClient,
  wrapIngressSendClient,
  wrapIngressWorkflowClient,
} from "./client-proxy";

const restateUrl = process.env.RESTATE_URL || "http://localhost:8080";
let ingress: restate.Ingress | undefined;

export const getRestateClient = () => {
  ingress ??= restate.connect({
    url: restateUrl,
  });
  return ingress;
};
/**
 * Standalone typed client functions for use outside of Restate contexts.
 * These functions create properly typed clients with automatic SuperJSON serde handling.
 *
 * The serde automatically handles:
 * - Date objects
 * - undefined values
 * - BigInt
 * - RegExp
 * - Set/Map
 * - And other JavaScript types that standard JSON cannot serialize
 */

/**
 * Creates a typed service client for use outside of Restate contexts
 * Automatically applies SuperJSON serde for proper type serialization
 * @param service The service definition
 * @param serde The serialization/deserialization configuration
 */
export function createServiceClient<THandlers>(
  service: ServiceDefinition<string, THandlers>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serde: Serde<any>,
) {
  const ingress = getRestateClient();
  const rawClient = ingress.serviceClient(service);
  return wrapIngressClient(rawClient, serde);
}

/**
 * Creates a typed service send client for use outside of Restate contexts
 * Automatically applies SuperJSON serde for proper type serialization
 * @param service The service definition
 * @param serde The serialization/deserialization configuration
 */
export function createServiceSendClient<THandlers>(
  service: ServiceDefinition<string, THandlers>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serde: Serde<any>,
) {
  const ingress = getRestateClient();
  const rawClient = ingress.serviceSendClient(service);
  return wrapIngressSendClient(rawClient, serde);
}

/**
 * Creates a typed object client for use outside of Restate contexts
 * Automatically applies SuperJSON serde for proper type serialization
 * @param object The virtual object definition to create a client for
 * @param key The unique identifier for the object instance
 * @param serde The serialization/deserialization configuration
 */
export function createObjectClient<THandlers>(
  object: VirtualObjectDefinition<string, THandlers>,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serde: Serde<any>,
) {
  const ingress = getRestateClient();
  const rawClient = ingress.objectClient(object, key);
  return wrapIngressClient(rawClient, serde);
}

/**
 * Creates a typed object send client for use outside of Restate contexts
 * Automatically applies SuperJSON serde for proper type serialization
 * @param object The virtual object definition for send operations
 * @param key The unique identifier for the object instance
 * @param serde The serialization/deserialization configuration
 */
export function createObjectSendClient<THandlers>(
  object: VirtualObjectDefinition<string, THandlers>,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serde: Serde<any>,
) {
  const ingress = getRestateClient();
  const rawClient = ingress.objectSendClient(object, key);
  return wrapIngressSendClient(rawClient, serde);
}

/**
 * Creates a typed workflow client for use outside of Restate contexts
 * Automatically applies SuperJSON serde for proper type serialization
 * @param workflow The workflow definition to create a client for
 * @param key The unique identifier for the workflow instance
 * @param serde The serialization/deserialization configuration
 */
export function createWorkflowClient<THandlers>(
  workflow: WorkflowDefinition<string, THandlers>,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serde: Serde<any>,
) {
  const ingress = getRestateClient();
  const rawClient = ingress.workflowClient(workflow, key);
  return wrapIngressWorkflowClient(rawClient, serde);
}

/**
 * Creates a typed workflow send client for use outside of Restate contexts
 * Automatically applies SuperJSON serde for proper type serialization
 * Note: Uses the regular workflow client which supports send operations
 * @param workflow The workflow definition to create a client for
 * @param key The unique identifier for the workflow instance
 * @param serde The serialization/deserialization configuration
 */
export function createWorkflowSendClient<THandlers>(
  workflow: WorkflowDefinition<string, THandlers>,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serde: Serde<any>,
) {
  // The typed workflow client supports both regular and send operations
  const ingress = getRestateClient();
  const rawClient = ingress.workflowClient(workflow, key);
  return wrapIngressWorkflowClient(rawClient, serde);
}
