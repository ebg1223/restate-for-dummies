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
  createWorkflowSendClient,
} from "./client-wrapper";
import { get as rawGet, run as rawRun, set as rawSet } from "./utils";

// Handler context that can be destructured
export type HandlerContext<TState> = {
  clearState: TypedClear<TState>;
  ctx: restate.ObjectContext;
  getState: TypedGet<TState>;
  runStep: TypedRun<TState>;
  setState: TypedSet<TState>;
} & BaseClientMethods;

// Transform handler types to match Restate's expected format
type TransformHandlers<TState, THandlers> = {
  [K in keyof THandlers]: TransformObjectHandler<
    HandlerContext<TState>,
    THandlers[K]
  >;
};

// The working solution: state type is provided once, handlers are defined inline
export function typedObject<TState>(
  name: string,
  SerdeClass: new () => restate.Serde<TState>,
) {
  return <
    THandlers extends {
      [key: string]: (
        context: HandlerContext<TState>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) => Promise<any>;
    },
  >(
    handlers: THandlers,
  ): VirtualObjectDefinition<string, TransformHandlers<TState, THandlers>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedHandlers: any = {};
    const serde = new SerdeClass();

    for (const [key, handlerFn] of Object.entries(handlers)) {
      transformedHandlers[key] = restate.handlers.object.exclusive(
        {
          input: new SerdeClass(),
          output: new SerdeClass(),
        },
        async (
          ctx: restate.ObjectContext,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...args: any[]
        ) => {
          const getState: TypedGet<TState> = (key, opts) =>
            rawGet(ctx as GetContext, key as string, new SerdeClass(), opts);

          const setState: TypedSet<TState> = (key, value, opts) =>
            rawSet(ctx as SetContext, key as string, value, opts);

          const clearState: TypedClear<TState> = (key) =>
            ctx.clear(key as string);

          const runStep: TypedRun<TState> = (name, action, opts) =>
            rawRun(ctx, name, action, new SerdeClass(), opts);

          const context: HandlerContext<TState> = {
            clearState,
            ctx,
            getState,
            runStep,
            setState,
            service: (service) => createServiceClient(ctx, service, serde),
            serviceSend: (service) =>
              createServiceSendClient(ctx, service, serde),
            object: (object, key) =>
              createObjectClient(ctx, object, key, serde),
            objectSend: (object, key) =>
              createObjectSendClient(ctx, object, key, serde),
            workflow: (workflow, key) =>
              createWorkflowClient(ctx, workflow, key, serde),
            workflowSend: (workflow, key) =>
              createWorkflowSendClient(ctx, workflow, key, serde),
          };
          return handlerFn(context, ...args);
        },
      );
    }

    return restate.object({
      name,
      handlers: transformedHandlers,
    }) as VirtualObjectDefinition<string, TransformHandlers<TState, THandlers>>;
  };
}

// For backwards compatibility with existing code
export { typedObject as createRestateObject };
