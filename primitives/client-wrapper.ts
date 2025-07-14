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

// Unified context type
type RestateContext = Context | ObjectContext | WorkflowContext | WorkflowSharedContext;

/**
 * Generic client creation function that handles all client types
 */
function createClient<THandlers, TDefinition>(
  ctx: RestateContext,
  definition: TDefinition,
  serde: Serde<unknown>,
  clientGetter: (ctx: RestateContext, def: TDefinition) => Client<THandlers> | SendClient<THandlers>
): Client<THandlers> | SendClient<THandlers> {
  const rawClient = clientGetter(ctx, definition);
  return 'send' in rawClient 
    ? wrapSendClientProxy(rawClient as SendClient<THandlers>, serde)
    : wrapClientProxy(rawClient as Client<THandlers>, serde);
}

/**
 * Creates a typed service client that automatically injects serde configuration
 */
export function createServiceClient<THandlers>(
  ctx: RestateContext,
  service: ServiceDefinition<string, THandlers>,
  serde: Serde<unknown>,
): Client<THandlers> {
  return createClient(ctx, service, serde, (c, s) => c.serviceClient(s)) as Client<THandlers>;
}

/**
 * Creates a typed object client that automatically injects serde configuration
 */
export function createObjectClient<THandlers>(
  ctx: RestateContext,
  object: VirtualObjectDefinition<string, THandlers>,
  key: string,
  serde: Serde<unknown>,
): Client<THandlers> {
  return createClient(ctx, { object, key }, serde, 
    (c, d) => c.objectClient(d.object, d.key)) as Client<THandlers>;
}

/**
 * Creates a typed workflow client that automatically injects serde configuration
 */
export function createWorkflowClient<THandlers>(
  ctx: RestateContext,
  workflow: WorkflowDefinition<string, THandlers>,
  key: string,
  serde: Serde<unknown>,
): Client<THandlers> {
  return createClient(ctx, { workflow, key }, serde,
    (c, d) => c.workflowClient(d.workflow, d.key)) as Client<THandlers>;
}

/**
 * Creates a typed service send client that automatically injects serde configuration
 */
export function createServiceSendClient<THandlers>(
  ctx: RestateContext,
  service: ServiceDefinition<string, THandlers>,
  serde: Serde<unknown>,
): SendClient<THandlers> {
  return createClient(ctx, service, serde, (c, s) => c.serviceSendClient(s)) as SendClient<THandlers>;
}

/**
 * Creates a typed object send client that automatically injects serde configuration
 */
export function createObjectSendClient<THandlers>(
  ctx: RestateContext,
  object: VirtualObjectDefinition<string, THandlers>,
  key: string,
  serde: Serde<unknown>,
): SendClient<THandlers> {
  return createClient(ctx, { object, key }, serde,
    (c, d) => c.objectSendClient(d.object, d.key)) as SendClient<THandlers>;
}

