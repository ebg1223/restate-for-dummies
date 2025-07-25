import type { WorkflowDefinition } from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk";

import type {
  BaseClientMethods,
  TransformWorkflowHandler,
  TransformWorkflowSharedHandler,
  TypedClear,
  TypedGet,
  TypedRun,
  TypedSet,
} from "./common-types";
import type { GetContext } from "./utils";

import {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createServiceSendClient,
  createWorkflowClient,
  createWorkflowSendClient,
} from "./client-wrapper";

import { get as rawGet, run as rawRun, set as rawSet } from "./utils";

// Handler context for the main run handler (has full access including set)
export type WorkflowHandlerContext<TState> = {
  clearState: TypedClear<TState>;
  ctx: restate.WorkflowContext;
  getState: TypedGet<TState>;
  runStep: TypedRun;
  setState: TypedSet<TState>;
} & BaseClientMethods;

// Handler context for shared handlers (no set access)
export type WorkflowSharedHandlerContext<TState> = {
  ctx: restate.WorkflowSharedContext;
  getState: TypedGet<TState>;
  runStep: TypedRun;
} & BaseClientMethods;

// Transform the run handler type to match Restate's expected format
type TransformRunHandler<TState, THandler> = TransformWorkflowHandler<
  WorkflowHandlerContext<TState>,
  THandler
>;

// Transform shared handler types to match Restate's expected format
type TransformSharedHandlers<TState, THandlers> = {
  [K in keyof THandlers]: TransformWorkflowSharedHandler<
    WorkflowSharedHandlerContext<TState>,
    THandlers[K]
  >;
};

// Combine run handler and shared handlers into a single type
type CombineHandlers<TRunHandler, TSharedHandlers> = {
  run: TRunHandler;
} & TSharedHandlers;

// The main factory function: state type is provided once, handlers are defined inline with a single object
export function createRestateWorkflow<TState>(
  name: string,
  SerdeClass: new <T>() => restate.Serde<T>,
) {
  return <
    THandlers extends {
      [K in Exclude<keyof THandlers, "run">]: (
        context: WorkflowSharedHandlerContext<TState>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) => Promise<any>;
    } & {
      run: (
        context: WorkflowHandlerContext<TState>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) => Promise<any>;
    },
  >(
    inputHandlers: THandlers,
  ): WorkflowDefinition<
    string,
    CombineHandlers<
      TransformRunHandler<TState, THandlers["run"]>,
      TransformSharedHandlers<TState, Omit<THandlers, "run">>
    >
  > => {
    const serde = new SerdeClass<any>();
    const { run: runHandler, ...sharedHandlers } = inputHandlers;

    // Transform the run handler
    const transformedRunHandler = restate.handlers.workflow.workflow(
      {
        input: new SerdeClass<any>(),
        output: new SerdeClass<any>(),
      },
      async (
        ctx: restate.WorkflowContext,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
      ) => {
        const getState: TypedGet<TState> = (key, opts) =>
          rawGet(ctx as GetContext, key as string, new SerdeClass<TState[typeof key]>());
        const setState: TypedSet<TState> = (key, value, opts) =>
          rawSet(ctx, key as string, value, new SerdeClass<TState[typeof key]>());

        const clearState: TypedClear<TState> = (key) =>
          ctx.clear(key as string);

        const runStep = <T>(
          name: Parameters<typeof rawRun<T>>[1],
          action: Parameters<typeof rawRun<T>>[2],
          opts?: Parameters<typeof rawRun<T>>[4],
        ) => rawRun<T>(ctx, name, action, new SerdeClass<T>(), opts);

        const context: WorkflowHandlerContext<TState> = {
          clearState,
          ctx,
          getState,
          setState,
          runStep: runStep as TypedRun,
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
        return runHandler(context, ...args);
      },
    );

    // Transform shared handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedSharedHandlers: any = {};

    for (const [key, handlerFn] of Object.entries(sharedHandlers)) {
      transformedSharedHandlers[key] = restate.handlers.workflow.shared(
        {
          input: new SerdeClass<any>(),
          output: new SerdeClass<any>(),
        },
        async (
          ctx: restate.WorkflowSharedContext,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...args: any[]
        ) => {
          const getState: TypedGet<TState> = (key, opts) =>
            rawGet(ctx as GetContext, key as string, new SerdeClass<TState[typeof key]>());

          const runStep = <T>(
            name: Parameters<typeof rawRun<T>>[1],
            action: Parameters<typeof rawRun<T>>[2],
            opts?: Parameters<typeof rawRun<T>>[4],
          ) => rawRun<T>(ctx, name, action, new SerdeClass<T>(), opts);

          const context: WorkflowSharedHandlerContext<TState> = {
            ctx,
            getState,
            runStep: runStep as TypedRun,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (handlerFn as any)(context, ...args);
        },
      );
    }

    // Create the workflow with the transformed handlers
    const transformedHandlers = {
      run: transformedRunHandler,
      ...transformedSharedHandlers,
    };

    return restate.workflow({
      name,
      handlers: transformedHandlers,
    }) as WorkflowDefinition<
      string,
      CombineHandlers<
        TransformRunHandler<TState, THandlers["run"]>,
        TransformSharedHandlers<TState, Omit<THandlers, "run">>
      >
    >;
  };
}

// For backwards compatibility or alternative naming preference
export { createRestateWorkflow as typedWorkflow };
