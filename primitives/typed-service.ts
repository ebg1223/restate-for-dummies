import type { ServiceDefinition } from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk";

import type {
  BaseClientMethods,
  TypedRun,
} from "./common-types";
import type { TransformHandlers } from "./type-utils";

import {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createServiceSendClient,
  createWorkflowClient,
} from "./client-wrapper";
import { run as rawRun } from "./utils";

// Handler context that can be destructured
export type ServiceHandlerContext = {
  ctx: restate.Context;
  runStep: TypedRun;
} & BaseClientMethods;

// Transform handler types to match Restate's expected format
export type TransformServiceHandlers<THandlers> = TransformHandlers<
  ServiceHandlerContext,
  restate.Context,
  THandlers
>;

// Create service with simplified type constraints
export function createRestateService<THandlers extends Record<string, (context: ServiceHandlerContext, ...args: any[]) => Promise<any>>>(
  name: string,
  handlers: THandlers,
  serde: restate.Serde<any>,
): ServiceDefinition<string, TransformServiceHandlers<THandlers>> {
  // Use mapped types to preserve handler structure
  const transformedHandlers = Object.fromEntries(
    Object.entries(handlers).map(([key, handlerFn]) => [
      key,
      restate.handlers.handler(
        { input: serde, output: serde },
        async (ctx, ...args) => {
          // Let TypeScript infer context structure
          const context = {
            ctx,
            runStep: (name, action, opts) => rawRun(ctx, name, action, opts),
            service: (service) => createServiceClient(ctx, service, serde),
            serviceSend: (service) => createServiceSendClient(ctx, service, serde),
            object: (object, key) => createObjectClient(ctx, object, key, serde),
            objectSend: (object, key) => createObjectSendClient(ctx, object, key, serde),
            workflow: (workflow, key) => createWorkflowClient(ctx, workflow, key, serde),
          } satisfies ServiceHandlerContext;
          
          return handlerFn(context, ...args);
        }
      ),
    ])
  );

  return restate.service({
    name,
    handlers: transformedHandlers,
  }) as ServiceDefinition<string, TransformServiceHandlers<THandlers>>;
}

// For backwards compatibility or alternative naming preference
export { createRestateService as typedService };
