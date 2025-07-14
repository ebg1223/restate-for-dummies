import * as restate from "@restatedev/restate-sdk";
import type { Serde } from "@restatedev/restate-sdk-core";
import type {
  TypedService,
  TypedObject,
  TypedWorkflow,
  StandaloneClients,
  ExtractHandlerType,
  ExtractObjectStateType,
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
  service<Handlers extends Record<string, (
    context: ServiceHandlerContext,
    ...args: any[]
  ) => Promise<any>>>(
    name: string,
    handlers: Handlers
  ): restate.ServiceDefinition<string, TransformServiceHandlers<Handlers>>;

  /**
   * Create a typed object with automatic serde injection
   */
  object<State, Handlers extends Record<string, (
    context: ObjectHandlerContext<State>,
    ...args: any[]
  ) => Promise<any>>>(
    name: string,
    handlers: Handlers
  ): restate.VirtualObjectDefinition<string, TransformObjectHandlers<State, Handlers>>;

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
    [K in Exclude<keyof Handlers, "run">]: (
      context: WorkflowSharedHandlerContext<any>,
      ...args: any[]
    ) => Promise<any>;
  } & {
    run: (context: WorkflowHandlerContext<any>, ...args: any[]) => Promise<any>;
  }>(
    name: string,
    handlers: Handlers
  ): restate.WorkflowDefinition<string, CombineHandlers<
    TransformRunHandler<any, Handlers["run"]>,
    TransformSharedHandlers<any, Omit<Handlers, "run">>
  >>;

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
 * Type helper to extract client type from a service
 */
export type ClientType<T> = T extends TypedService<infer H>
  ? { [K in keyof H]: ExtractHandlerType<H[K]> }
  : never;

/**
 * Type helper to extract object client type
 */
export type ObjectClientType<T> = T extends TypedObject<infer S, infer H>
  ? { [K in keyof H]: ExtractHandlerType<H[K]> }
  : never;

/**
 * Type helper to extract workflow client type
 */
export type WorkflowClientType<T> = T extends TypedWorkflow<infer H>
  ? H extends { run: infer R }
    ? {
        run: ExtractHandlerType<R>;
        getStatus(): Promise<any>; // WorkflowStatus type not exported by SDK
      } & { [K in Exclude<keyof H, "run">]: ExtractHandlerType<H[K]> }
    : never
  : never;