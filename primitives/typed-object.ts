import type { VirtualObjectDefinition } from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk";

import type {
  BaseClientMethods,
  TransformObjectHandler,
  TypedClear,
  TypedGet,
  TypedRun,
  TypedSet,
} from "./common-types";
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
export type TransformObjectHandlers<TState, THandlers> = {
  [K in keyof THandlers]: TransformObjectHandler<
    HandlerContext<TState>,
    THandlers[K]
  >;
};

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedHandlers: any = {};

    for (const [key, handlerFn] of Object.entries(handlers)) {
      transformedHandlers[key] = restate.handlers.object.exclusive(
        {
          input: serde,
          output: serde,
        },
        async (
          ctx: restate.ObjectContext,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...args: any[]
        ) => {
          const getState: TypedGet<TState> = (key, opts) =>
            rawGet(ctx as GetContext, key as string, opts);

          const setState: TypedSet<TState> = (key, value, opts) =>
            rawSet(ctx as SetContext, key as string, value, opts);

          const clearState: TypedClear<TState> = (key) =>
            ctx.clear(key as string);

          const runStep: TypedRun = (name, action, opts) =>
            rawRun(ctx, name, action, opts);

          const context: HandlerContext<TState> = {
            clearState,
            ctx,
            getState,
            runStep,
            setState,
            service: (service) =>
              createServiceClient(ctx, service, serde),
            serviceSend: (service) =>
              createServiceSendClient(ctx, service, serde),
            object: (object, key) =>
              createObjectClient(ctx, object, key, serde),
            objectSend: (object, key) =>
              createObjectSendClient(ctx, object, key, serde),
            workflow: (workflow, key) =>
              createWorkflowClient(ctx, workflow, key, serde),
          };
          return handlerFn(context, ...args);
        },
      );
    }

  return restate.object({
    name,
    handlers: transformedHandlers,
  }) as VirtualObjectDefinition<string, TransformObjectHandlers<TState, typeof handlers>>;
}

// For backwards compatibility with existing code
export { createRestateObject as typedObject };
