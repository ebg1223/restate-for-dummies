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

// The working solution: use higher-order function pattern
export function createRestateService(
  name: string,
  SerdeClass: new <T>() => restate.Serde<T>,
) {
  const serde = new SerdeClass<any>();
  return <
    THandlers extends {
      [key: string]: (
        context: ServiceHandlerContext,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) => Promise<any>;
    },
  >(
    handlers: THandlers,
  ): ServiceDefinition<string, TransformHandlers<THandlers>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedHandlers: any = {};

    for (const [key, handlerFn] of Object.entries(handlers)) {
      // Wrap each handler with SuperJsonSerde
      transformedHandlers[key] = restate.handlers.handler(
        {
          input: new SerdeClass<any>(),
          output: new SerdeClass<any>(),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (ctx: restate.Context, ...args: any[]) => {
          const runStep = <T>(
            name: Parameters<typeof rawRun<T>>[1],
            action: Parameters<typeof rawRun<T>>[2],
            opts: Parameters<typeof rawRun<T>>[4],
          ) => rawRun<T>(ctx, name, action, new SerdeClass<T>(), opts);

          const context: ServiceHandlerContext = {
            ctx,
            runStep,
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

    const service = restate.service({
      name,
      handlers: transformedHandlers,
    });
    
    return service as ServiceDefinition<string, TransformHandlers<THandlers>>;
  };
}

// For backwards compatibility or alternative naming preference
export { createRestateService as typedService };
