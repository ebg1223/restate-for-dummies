import type { WorkflowDefinition } from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk";

import type {
  BaseClientMethods,
  TypedClear,
  TypedGet,
  TypedRun,
  TypedSet,
} from "./common-types";
import type { TransformHandlers } from "./type-utils";
import type { GetContext } from "./utils";

import {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createServiceSendClient,
  createWorkflowClient,
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
export type TransformRunHandler<TState, THandler> = TransformHandlers<
  WorkflowHandlerContext<TState>,
  restate.WorkflowContext,
  { run: THandler }
>['run'];

// Transform shared handler types to match Restate's expected format
export type TransformSharedHandlers<TState, THandlers> = TransformHandlers<
  WorkflowSharedHandlerContext<TState>,
  restate.WorkflowSharedContext,
  THandlers
>;

// Combine run handler and shared handlers into a single type
export type CombineHandlers<TRunHandler, TSharedHandlers> = {
  run: TRunHandler;
} & TSharedHandlers;

// Constraint for workflow handlers with proper typing
type WorkflowHandlerConstraint<TState> = {
  run: (context: WorkflowHandlerContext<TState>, ...args: any[]) => Promise<any>;
  [K: string]: (context: any, ...args: any[]) => Promise<any>;
};

// Create typed workflow with serde configuration
export function createRestateWorkflow<
  TState,
  THandlers extends WorkflowHandlerConstraint<TState>
>(
  name: string,
  inputHandlers: THandlers,
  serde: restate.Serde<any>,
): WorkflowDefinition<string, any> {
    const { run: runHandler, ...sharedHandlers } = inputHandlers;

    // Transform the run handler
    const transformedRunHandler = restate.handlers.workflow.workflow(
      {
        input: serde,
        output: serde,
      },
      async (
        ctx: restate.WorkflowContext,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
      ) => {
        const getState: TypedGet<TState> = (key, opts) =>
          rawGet(ctx as GetContext, key as string, opts);
        const setState: TypedSet<TState> = (key, value, opts) =>
          rawSet(ctx, key as string, value, opts);

        const clearState: TypedClear<TState> = (key) =>
          ctx.clear(key as string);

        const runStep: TypedRun = (name, action, opts) =>
          rawRun(ctx, name, action, opts);

        const context: WorkflowHandlerContext<TState> = {
          clearState,
          ctx,
          getState,
          setState,
          runStep,
          service: (service) => {
            console.log(
              "[typed-workflow] Creating service client, serde:",
              serde,
            );
            return createServiceClient(ctx, service, serde);
          },
          serviceSend: (service) => {
            console.log(
              "[typed-workflow] Creating service send client, serde:",
              serde,
            );
            return createServiceSendClient(ctx, service, serde);
          },
          object: (object, key) => {
            console.log(
              "[typed-workflow] Creating object client, key:",
              key,
              "serde:",
              serde,
            );
            return createObjectClient(ctx, object, key, serde);
          },
          objectSend: (object, key) => {
            console.log(
              "[typed-workflow] Creating object send client, key:",
              key,
              "serde:",
              serde,
            );
            return createObjectSendClient(ctx, object, key, serde);
          },
          workflow: (workflow, key) => {
            console.log(
              "[typed-workflow] Creating workflow client, key:",
              key,
              "serde:",
              serde,
            );
            return createWorkflowClient(ctx, workflow, key, serde);
          },
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
          input: serde,
          output: serde,
        },
        async (
          ctx: restate.WorkflowSharedContext,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...args: any[]
        ) => {
          const getState: TypedGet<TState> = (key, opts) =>
            rawGet(ctx as GetContext, key as string, opts);

          const runStep: TypedRun = (name, action, opts) =>
            rawRun(ctx, name, action, opts);

          const context: WorkflowSharedHandlerContext<TState> = {
            ctx,
            getState,
            runStep,
            service: (service) => {
              console.log(
                "[typed-workflow-shared] Creating service client, serde:",
                serde,
              );
              return createServiceClient(ctx, service, serde);
            },
            serviceSend: (service) => {
              console.log(
                "[typed-workflow-shared] Creating service send client, serde:",
                serde,
              );
              return createServiceSendClient(ctx, service, serde);
            },
            object: (object, key) => {
              console.log(
                "[typed-workflow-shared] Creating object client, key:",
                key,
                "serde:",
                serde,
              );
              return createObjectClient(ctx, object, key, serde);
            },
            objectSend: (object, key) => {
              console.log(
                "[typed-workflow-shared] Creating object send client, key:",
                key,
                "serde:",
                serde,
              );
              return createObjectSendClient(ctx, object, key, serde);
            },
            workflow: (workflow, key) => {
              console.log(
                "[typed-workflow-shared] Creating workflow client, key:",
                key,
                "serde:",
                serde,
              );
              return createWorkflowClient(ctx, workflow, key, serde);
            },
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
  });
}

// For backwards compatibility or alternative naming preference
export { createRestateWorkflow as typedWorkflow };
