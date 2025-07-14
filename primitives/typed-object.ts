import type { VirtualObjectDefinition } from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk";

import type {
  BaseClientMethods,
  TypedClear,
  TypedGet,
  TypedRun,
  TypedSet,
} from "./common-types";
import type { TransformHandlers } from "./type-utils";
import type { GetContext, SetContext } from "./utils";

import {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createServiceSendClient,
  createWorkflowClient,
} from "./client-wrapper";
import { get as rawGet, run as rawRun, set as rawSet } from "./utils";

// Handler context that can be destructured
export type HandlerContext<TState> = {
  clearState: TypedClear<TState>;
  ctx: restate.ObjectContext;
  getState: TypedGet<TState>;
  runStep: TypedRun;
  setState: TypedSet<TState>;
} & BaseClientMethods;

// Transform handler types to match Restate's expected format
export type TransformObjectHandlers<TState, THandlers> = TransformHandlers<
  HandlerContext<TState>,
  restate.ObjectContext,
  THandlers
>;

// Create typed object with serde configuration
export function createRestateObject<TState>(
  name: string,
  handlers: {
    [key: string]: (
      context: HandlerContext<TState>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => Promise<any>;
  },
  serde: restate.Serde<any>,
): VirtualObjectDefinition<string, TransformObjectHandlers<TState, typeof handlers>> {
    // Use mapped types to preserve handler structure
    const transformedHandlers = Object.fromEntries(
      Object.entries(handlers).map(([key, handlerFn]) => [
        key,
        restate.handlers.object.exclusive(
          { input: serde, output: serde },
          async (ctx, ...args) => {
            // Create context with proper typing
            const context = {
              ctx,
              getState: (key, opts) => rawGet(ctx as GetContext, key as string, opts),
              setState: (key, value, opts) => rawSet(ctx as SetContext, key as string, value, opts),
              clearState: (key) => ctx.clear(key as string),
              runStep: (name, action, opts) => rawRun(ctx, name, action, opts),
              service: (service) => createServiceClient(ctx, service, serde),
              serviceSend: (service) => createServiceSendClient(ctx, service, serde),
              object: (object, key) => createObjectClient(ctx, object, key, serde),
              objectSend: (object, key) => createObjectSendClient(ctx, object, key, serde),
              workflow: (workflow, key) => createWorkflowClient(ctx, workflow, key, serde),
            } as HandlerContext<TState>;
            
            return handlerFn(context, ...args);
          }
        ),
      ])
    );

  return restate.object({
    name,
    handlers: transformedHandlers,
  }) as VirtualObjectDefinition<string, TransformObjectHandlers<TState, typeof handlers>>;
}

// For backwards compatibility with existing code
export { createRestateObject as typedObject };
