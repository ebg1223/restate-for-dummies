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
export type ObjectHandlerContext<TState> = {
  clearState: TypedClear<TState>;
  ctx: restate.ObjectContext;
  getState: TypedGet<TState>;
  runStep: TypedRun;
  setState: TypedSet<TState>;
} & BaseClientMethods;

// Alias for backwards compatibility
export type HandlerContext<TState> = ObjectHandlerContext<TState>;

// Transform handler types to match Restate's expected format
type TransformHandlers<TState, THandlers> = {
  [K in keyof THandlers]: TransformObjectHandler<
    ObjectHandlerContext<TState>,
    THandlers[K]
  >;
};

// The working solution: state type is provided once, handlers are defined inline
// Note: The context parameter MUST be in the constraint for TypeScript to infer it properly
// when using destructuring syntax like ({ getState, setState }, arg1, arg2)
export function typedObject<TState>(
  name: string,
  SerdeClass: new <T>() => restate.Serde<T>,
) {
  return <
    THandlers extends {
      [key: string]: (
        context: ObjectHandlerContext<TState>,
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
    const serde = new SerdeClass<any>();

    for (const [key, handlerFn] of Object.entries(handlers)) {
      transformedHandlers[key] = restate.handlers.object.exclusive(
        {
          input: new SerdeClass<any>(),
          output: new SerdeClass<any>(),
        },
        async (
          ctx: restate.ObjectContext,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...args: any[]
        ) => {
          const getState: TypedGet<TState> = (key, opts) =>
            rawGet(ctx as GetContext, key as string, new SerdeClass<TState[typeof key]>());

          const setState: TypedSet<TState> = (key, value, opts) =>
            rawSet(ctx as SetContext, key as string, value, new SerdeClass<TState[typeof key]>());

          const clearState: TypedClear<TState> = (key) =>
            ctx.clear(key as string);

          const runStep = <T>(
            name: Parameters<typeof rawRun<T>>[1],
            action: Parameters<typeof rawRun<T>>[2],
            opts?: Parameters<typeof rawRun<T>>[4],
          ) => rawRun<T>(ctx, name, action, new SerdeClass<T>(), opts);

          const context: ObjectHandlerContext<TState> = {
            clearState,
            ctx,
            getState,
            runStep: runStep as TypedRun,
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
