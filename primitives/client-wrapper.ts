import type {
  Client,
  Context,
  ObjectContext,
  SendClient,
  Serde,
  ServiceDefinition,
  VirtualObjectDefinition,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowSharedContext,
} from "@restatedev/restate-sdk";

import {
  wrapClient as wrapClientProxy,
  wrapSendClient as wrapSendClientProxy,
} from "./client-proxy";

/**
 * Creates a typed service client that automatically injects serde configuration
 * @param ctx The Restate context
 * @param service The service definition
 * @param serde The serialization/deserialization configuration
 */
export function createServiceClient<THandlers>(
  ctx: Context | ObjectContext | WorkflowContext | WorkflowSharedContext,
  service: ServiceDefinition<string, THandlers>,
  serde: Serde<unknown>,
): Client<THandlers> {
  const rawClient = ctx.serviceClient(service);
  return wrapClientProxy(rawClient, serde);
}

/**
 * Creates a typed object client that automatically injects serde configuration
 * @param ctx The Restate context
 * @param object The virtual object definition to create a client for
 * @param key The unique identifier for the object instance
 * @param serde The serialization/deserialization configuration
 */
export function createObjectClient<THandlers>(
  ctx: Context | ObjectContext | WorkflowContext | WorkflowSharedContext,
  object: VirtualObjectDefinition<string, THandlers>,
  key: string,
  serde: Serde<unknown>,
): Client<THandlers> {
  const rawClient = ctx.objectClient(object, key);
  return wrapClientProxy(rawClient, serde);
}

/**
 * Creates a typed workflow client that automatically injects serde configuration
 * @param ctx The Restate context
 * @param workflow The workflow definition to create a client for
 * @param key The unique identifier for the workflow instance
 * @param serde The serialization/deserialization configuration
 */
export function createWorkflowClient<THandlers>(
  ctx: Context | ObjectContext | WorkflowContext | WorkflowSharedContext,
  workflow: WorkflowDefinition<string, THandlers>,
  key: string,
  serde: Serde<unknown>,
): Client<THandlers> {
  const rawClient = ctx.workflowClient(workflow, key);
  return wrapClientProxy(rawClient, serde);
}

/**
 * Creates a typed service send client that automatically injects serde configuration
 * @param ctx The Restate context
 * @param service The service definition
 * @param serde The serialization/deserialization configuration
 */
export function createServiceSendClient<THandlers>(
  ctx: Context | ObjectContext | WorkflowContext | WorkflowSharedContext,
  service: ServiceDefinition<string, THandlers>,
  serde: Serde<unknown>,
): SendClient<THandlers> {
  const rawClient = ctx.serviceSendClient(service);
  return wrapSendClientProxy(rawClient, serde);
}

/**
 * Creates a typed object send client that automatically injects serde configuration
 * @param ctx The Restate context
 * @param object The virtual object definition for send operations
 * @param key The unique identifier for the object instance
 * @param serde The serialization/deserialization configuration
 */
export function createObjectSendClient<THandlers>(
  ctx: Context | ObjectContext | WorkflowContext | WorkflowSharedContext,
  object: VirtualObjectDefinition<string, THandlers>,
  key: string,
  serde: Serde<unknown>,
): SendClient<THandlers> {
  const rawClient = ctx.objectSendClient(object, key);
  return wrapSendClientProxy(rawClient, serde);
}

