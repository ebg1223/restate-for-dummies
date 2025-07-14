import type {
  ServiceDefinition,
  VirtualObjectDefinition,
  WorkflowDefinition,
} from "@restatedev/restate-sdk";
import type { IngressClient, IngressSendClient, IngressWorkflowClient } from "@restatedev/restate-sdk-clients";

import * as restate from "@restatedev/restate-sdk";

import type { BaseOpts, RunFunc, RunOpts } from "./utils";
import type { ExtractHandlerSignature, BaseHandler, TransformHandler } from "./type-utils";
export type { TransformHandler, TransformHandlers, HandlersToClient, HandlerCollection } from "./type-utils";


// Type for the run function - shared across all primitives
export type TypedRun = <T>(
  name: string,
  action: RunFunc<T>,
  opts?: RunOpts<T>,
) => restate.RestatePromise<T>;

// State management types - shared between object and workflow
export type TypedGet<TState> = <K extends keyof TState>(
  key: K,
  opts?: BaseOpts<TState[K]>,
) => Promise<null | TState[K]>;

export type TypedSet<TState> = <K extends keyof TState>(
  key: K,
  value: TState[K],
  opts?: BaseOpts<TState[K]>,
) => void;

export type TypedClear<TState> = <K extends keyof TState>(key: K) => void;

// Base client methods - shared across all handler contexts
export interface BaseClientMethods {
  object: <THandlers>(
    object: VirtualObjectDefinition<string, THandlers>,
    key: string,
  ) => restate.Client<THandlers>;
  objectSend: <THandlers>(
    object: VirtualObjectDefinition<string, THandlers>,
    key: string,
  ) => restate.SendClient<THandlers>;
  service: <THandlers>(
    service: ServiceDefinition<string, THandlers>,
  ) => restate.Client<THandlers>;
  serviceSend: <THandlers>(
    service: ServiceDefinition<string, THandlers>,
  ) => restate.SendClient<THandlers>;
  workflow: <THandlers>(
    workflow: WorkflowDefinition<string, THandlers>,
    key: string,
  ) => restate.Client<THandlers>;
}



// Standalone clients interface
export interface StandaloneClients {
  service: <THandlers>(
    service: ServiceDefinition<string, THandlers>
  ) => IngressClient<THandlers>;
  serviceSend: <THandlers>(
    service: ServiceDefinition<string, THandlers>
  ) => IngressSendClient<THandlers>;
  object: <THandlers>(
    object: VirtualObjectDefinition<string, THandlers>,
    key: string
  ) => IngressClient<THandlers>;
  objectSend: <THandlers>(
    object: VirtualObjectDefinition<string, THandlers>,
    key: string
  ) => IngressSendClient<THandlers>;
  workflow: <THandlers>(
    workflow: WorkflowDefinition<string, THandlers>,
    key: string
  ) => IngressWorkflowClient<THandlers>;
}

// Extract handler type helper - simplified using utility
export type ExtractHandlerType<T> = T extends BaseHandler<any>
  ? ExtractHandlerSignature<T>
  : never;

// Extract object state type helper
export type ExtractObjectStateType<T> =
  T extends VirtualObjectDefinition<string, any> ? T extends VirtualObjectDefinition<string, infer H> ? H extends Record<string, any> ? any : never : never : never;
