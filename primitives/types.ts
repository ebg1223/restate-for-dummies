import * as restate from "@restatedev/restate-sdk";
import type { Serde } from "@restatedev/restate-sdk-core";
import type {
  ServiceDefinition,
  VirtualObjectDefinition,
  WorkflowDefinition,
} from "@restatedev/restate-sdk";
import type {
  StandaloneClients,
  ExtractHandlerType,
  ExtractObjectStateType,
  HandlersToClient,
} from "./common-types";
import type { ServiceHandlerContext, TransformServiceHandlers } from "./typed-service";
import type { HandlerContext as ObjectHandlerContext, TransformObjectHandlers } from "./typed-object";
import type { 
  WorkflowHandlerContext, 
  WorkflowSharedHandlerContext,
  TransformRunHandler,
  TransformSharedHandlers,
  CombineHandlers
} from "./typed-workflow";

/**
 * Serde interface that users must implement
 * Matches Restate SDK's requirements
 */
export type { Serde } from "@restatedev/restate-sdk-core";

/**
 * Workflow handler constraints
 */
export type WorkflowRunHandler = (context: WorkflowHandlerContext<any>, ...args: any[]) => Promise<any>;
export type WorkflowSharedHandler = (context: WorkflowSharedHandlerContext<any>, ...args: any[]) => Promise<any>;

export type WorkflowHandlers = {
  [K in string]: K extends 'run' ? WorkflowRunHandler : WorkflowSharedHandler;
} & {
  run: WorkflowRunHandler;
};

/**
 * Helper types for improved object type inference
 */
export type ObjectDefinition<State> = 
  | Record<string, (context: ObjectHandlerContext<State>, ...args: any[]) => Promise<any>>
  | { state?: State; handlers: Record<string, (context: ObjectHandlerContext<State>, ...args: any[]) => Promise<any>> };

export type InferObjectType<T> = T extends { state?: infer S; handlers: infer H }
  ? VirtualObjectDefinition<string, TransformObjectHandlers<S, H>>
  : T extends Record<string, any>
  ? VirtualObjectDefinition<string, TransformObjectHandlers<unknown, T>>
  : never;

/**
 * Configuration for the Restate factory
 */
export interface FactoryConfig {
  /**
   * Serialization/deserialization implementation
   * Users must provide their own implementation
   */
  serde: Serde<any>;
}

/**
 * The factory interface returned by createRestateFactory
 * Provides methods to create all Restate primitives with consistent configuration
 */
export interface RestateFactory {
  /**
   * Create a typed service with automatic serde injection
   */
  service<Handlers extends Record<string, (context: ServiceHandlerContext, ...args: any[]) => Promise<any>>>(
    name: string,
    handlers: Handlers
  ): restate.ServiceDefinition<string, TransformServiceHandlers<Handlers>>;

  /**
   * Create a typed object with automatic serde injection
   * Supports both direct handlers or object with state type
   * @example
   * // Direct handlers (state type inferred as unknown)
   * restate.object("Counter", {
   *   increment: async ({ getState, setState }) => { ... }
   * })
   * 
   * // With explicit state type
   * restate.object<{ count: number }>("Counter", {
   *   increment: async ({ getState, setState }) => { ... }
   * })
   */
  object<T extends ObjectDefinition<any>>(name: string, definition: T): InferObjectType<T>;

  /**
   * Alternative object creation with better type inference
   * Usage: restate.objectWithState<State>("name").handlers({ ... })
   */
  objectWithState<State>(name: string): {
    handlers<Handlers extends Record<string, (
      context: ObjectHandlerContext<State>,
      ...args: any[]
    ) => Promise<any>>>(
      handlers: Handlers
    ): restate.VirtualObjectDefinition<string, TransformObjectHandlers<State, Handlers>>;
  };

  /**
   * Create a typed workflow with automatic serde injection
   */
  workflow<Handlers extends {
    run: (context: WorkflowHandlerContext<any>, ...args: any[]) => Promise<any>;
    [K: string]: (context: any, ...args: any[]) => Promise<any>;
  }, State = any>(
    name: string,
    handlers: Handlers
  ): restate.WorkflowDefinition<string, any>;

  /**
   * Create standalone clients for use outside Restate contexts
   */
  standaloneClients(baseUrl: string): StandaloneClients;

  /**
   * Access the configured serde
   * Useful when users need direct access to the serde implementation
   */
  serde: Serde<any>;
}

/**
 * Simplified client type extraction using HandlersToClient utility
 */
export type ClientType<T> = T extends ServiceDefinition<any, infer H>
  ? HandlersToClient<H>
  : T extends VirtualObjectDefinition<any, infer H>
  ? HandlersToClient<H>
  : T extends WorkflowDefinition<any, infer H>
  ? HandlersToClient<H> & {
      getStatus(): Promise<any>; // WorkflowStatus type not exported by SDK
    }
  : never;