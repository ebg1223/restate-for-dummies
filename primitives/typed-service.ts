import type { ServiceDefinition } from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk";

import type {
  BaseClientMethods,
  TransformServiceHandler,
  TypedRun,
} from "./common-types";

import {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createServiceSendClient,
  createWorkflowClient,
  createWorkflowSendClient,
} from "./client-wrapper";
import { run as rawRun } from "./utils";

// Handler context that can be destructured
export type ServiceHandlerContext = {
  ctx: restate.Context;
  runStep: TypedRun;
} & BaseClientMethods;

// Transform handler types to match Restate's expected format
type TransformHandlers<THandlers> = {
  [K in keyof THandlers]: TransformServiceHandler<
    ServiceHandlerContext,
    THandlers[K]
  >;
};

// The working solution: handlers are defined inline
export function createRestateService<
  THandlers extends {
    [key: string]: (
      context: ServiceHandlerContext,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => Promise<any>;
  },
  SState,
>(
  name: string,
  handlers: THandlers,
  SerdeClass: new () => restate.Serde<SState>,
): ServiceDefinition<string, TransformHandlers<THandlers>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedHandlers: any = {};

  for (const [key, handlerFn] of Object.entries(handlers)) {
    // Wrap each handler with SuperJsonSerde
    transformedHandlers[key] = restate.handlers.handler(
      {
        input: new SerdeClass(),
        output: new SerdeClass(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (ctx: restate.Context, ...args: any[]) => {
        const runStep: TypedRun = (name, action, opts) =>
          rawRun(ctx, name, action, opts);

        const context: ServiceHandlerContext = {
          ctx,
          runStep,
          service: (service, serde) => createServiceClient(ctx, service, serde),
          serviceSend: (service, serde) =>
            createServiceSendClient(ctx, service, serde),
          object: (object, key, serde) =>
            createObjectClient(ctx, object, key, serde),
          objectSend: (object, key, serde) =>
            createObjectSendClient(ctx, object, key, serde),
          workflow: (workflow, key, serde) =>
            createWorkflowClient(ctx, workflow, key, serde),
          workflowSend: (workflow, key, serde) =>
            createWorkflowSendClient(ctx, workflow, key, serde),
        };
        return handlerFn(context, ...args);
      },
    );
  }

  return restate.service({
    name,
    handlers: transformedHandlers,
  }) as ServiceDefinition<string, TransformHandlers<THandlers>>;
}

// For backwards compatibility or alternative naming preference
export { createRestateService as typedService };
