import * as restate from "@restatedev/restate-sdk";
import type { Serde } from "@restatedev/restate-sdk-core";
import type { FactoryConfig, RestateFactory, ObjectDefinition, InferObjectType } from "./types";
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
    service<Handlers extends Record<string, (context: ServiceHandlerContext, ...args: any[]) => Promise<any>>>(
      name: string,
      handlers: Handlers
    ) {
      return typedService(name, handlers, serde);
    },

    // Improved object method with better type inference
    object<T extends ObjectDefinition<any>>(name: string, definition: T) {
      const handlers = (definition && typeof definition === 'object' && 'handlers' in definition && !Array.isArray(definition)) 
        ? definition.handlers 
        : definition;
      return typedObject(name, handlers as any, serde) as InferObjectType<T>;
    },

    // Keep builder API for backwards compatibility
    objectWithState<State>(name: string) {
      return {
        handlers<Handlers extends Record<string, (
          context: ObjectHandlerContext<State>,
          ...args: any[]
        ) => Promise<any>>>(handlers: Handlers) {
          return typedObject<State>(name, handlers, serde) as restate.VirtualObjectDefinition<string, TransformObjectHandlers<State, Handlers>>;
        }
      };
    },

    workflow<Handlers extends {
      run: (context: WorkflowHandlerContext<any>, ...args: any[]) => Promise<any>;
      [K: string]: (context: any, ...args: any[]) => Promise<any>;
    }, State = any>(name: string, handlers: Handlers) {
      return typedWorkflow<State, Handlers>(name, handlers, serde);
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
      };
    },

    serde,
  };
}

