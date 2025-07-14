import * as restate from "@restatedev/restate-sdk";
import type { Serde } from "@restatedev/restate-sdk-core";
import type { FactoryConfig, RestateFactory } from "./types";
import type {
  TypedService,
  TypedObject,
  TypedWorkflow,
} from "./common-types";
import type { ServiceHandlerContext } from "./typed-service";
import type { HandlerContext as ObjectHandlerContext, TransformObjectHandlers } from "./typed-object";
import type { WorkflowHandlerContext, WorkflowSharedHandlerContext } from "./typed-workflow";
import { typedService } from "./typed-service";
import { typedObject } from "./typed-object";
import { typedWorkflow } from "./typed-workflow";
import {
  createStandaloneServiceClient,
  createStandaloneServiceSendClient,
  createStandaloneObjectClient,
  createStandaloneObjectSendClient,
  createStandaloneWorkflowClient,
  createStandaloneWorkflowSendClient,
} from "./standalone-clients";

/**
 * Creates a Restate factory with consistent configuration
 * 
 * @param config Factory configuration including serde
 * @returns RestateFactory instance with all primitive creators
 * 
 * @example
 * ```typescript
 * // Create your own serde implementation
 * const mySerde: Serde<any> = {
 *   serialize: (value) => new TextEncoder().encode(JSON.stringify(value)),
 *   deserialize: (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
 *   contentType: "application/json"
 * };
 * 
 * // Initialize factory
 * const restate = createRestateFactory({ serde: mySerde });
 * 
 * // Use factory to create primitives
 * const myService = restate.service('MyService', {
 *   greet: async ({ ctx }, name: string) => `Hello ${name}!`
 * });
 * ```
 */
export function createRestateFactory(config: FactoryConfig): RestateFactory {
  const { serde } = config;

  return {
    service<Handlers extends Record<string, (
      context: ServiceHandlerContext,
      ...args: any[]
    ) => Promise<any>>>(
      name: string,
      handlers: Handlers
    ) {
      // Create service with factory serde
      return typedService(name, handlers, serde);
    },

    object<State, Handlers extends Record<string, (
      context: ObjectHandlerContext<State>,
      ...args: any[]
    ) => Promise<any>>>(
      name: string,
      handlers: Handlers
    ) {
      // Create object with factory serde
      return typedObjectWithSerde<State, Handlers>(name, handlers, serde);
    },

    // Alternative API with better type inference
    objectWithState<State>(name: string) {
      return {
        handlers<Handlers extends Record<string, (
          context: ObjectHandlerContext<State>,
          ...args: any[]
        ) => Promise<any>>>(handlers: Handlers) {
          return typedObjectWithSerde<State, Handlers>(name, handlers, serde);
        }
      };
    },

    workflow<
      Handlers extends {
        run: (context: WorkflowHandlerContext<any>, ...args: any[]) => Promise<any>;
        shared?: Record<string, (context: WorkflowSharedHandlerContext<any>, ...args: any[]) => Promise<any>>;
      }
    >(name: string, handlers: Handlers) {
      // Create workflow with factory serde
      return typedWorkflowWithSerde(name, handlers, serde);
    },

    standaloneClients(baseUrl: string) {
      return {
        service: <THandlers>(service: restate.ServiceDefinition<string, THandlers>) =>
          createStandaloneServiceClient(baseUrl, service, serde),
        serviceSend: <THandlers>(service: restate.ServiceDefinition<string, THandlers>) =>
          createStandaloneServiceSendClient(baseUrl, service, serde),
        object: <THandlers>(object: restate.VirtualObjectDefinition<string, THandlers>, key: string) =>
          createStandaloneObjectClient(baseUrl, object, key, serde),
        objectSend: <THandlers>(object: restate.VirtualObjectDefinition<string, THandlers>, key: string) =>
          createStandaloneObjectSendClient(baseUrl, object, key, serde),
        workflow: <THandlers>(workflow: restate.WorkflowDefinition<string, THandlers>, key: string) =>
          createStandaloneWorkflowClient(baseUrl, workflow, key, serde),
        workflowSend: <THandlers>(workflow: restate.WorkflowDefinition<string, THandlers>, key: string) =>
          createStandaloneWorkflowSendClient(baseUrl, workflow, key, serde),
      };
    },

    serde,
  };
}

// Helper functions to adapt existing implementations to accept serde
// These will be replaced when we update the primitive implementations

function typedObjectWithSerde<State, Handlers extends Record<string, (
  context: ObjectHandlerContext<State>,
  ...args: any[]
) => Promise<any>>>(
  name: string,
  handlers: Handlers,
  serde: Serde<any>
) {
  return typedObject(name, handlers, serde) as restate.VirtualObjectDefinition<string, TransformObjectHandlers<State, Handlers>>;
}

function typedWorkflowWithSerde<
  Handlers extends {
    run: (context: WorkflowHandlerContext<any>, ...args: any[]) => Promise<any>;
    shared?: Record<string, (context: WorkflowSharedHandlerContext<any>, ...args: any[]) => Promise<any>>;
  }
>(name: string, handlers: Handlers, serde: Serde<any>) {
  return typedWorkflow(name, handlers as any, serde);
}