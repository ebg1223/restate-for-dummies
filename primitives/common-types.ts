import type {
  ServiceDefinition,
  VirtualObjectDefinition,
  WorkflowDefinition,
} from "@restatedev/restate-sdk";

import * as restate from "@restatedev/restate-sdk";

import type { BaseOpts, RunFunc, RunOpts } from "./utils";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serde: restate.Serde<any>,
  ) => restate.Client<THandlers>;
  objectSend: <THandlers>(
    object: VirtualObjectDefinition<string, THandlers>,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serde: restate.Serde<any>,
  ) => restate.SendClient<THandlers>;
  service: <THandlers>(
    service: ServiceDefinition<string, THandlers>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serde: restate.Serde<any>,
  ) => restate.Client<THandlers>;
  serviceSend: <THandlers>(
    service: ServiceDefinition<string, THandlers>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serde: restate.Serde<any>,
  ) => restate.SendClient<THandlers>;
  workflow: <THandlers>(
    workflow: WorkflowDefinition<string, THandlers>,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serde: restate.Serde<any>,
  ) => restate.Client<THandlers>;
  workflowSend: <THandlers>(
    workflow: WorkflowDefinition<string, THandlers>,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serde: restate.Serde<any>,
  ) => restate.SendClient<THandlers>;
}

// Handler transformation types for Object handlers
export type TransformObjectHandler<TContext, THandler> = THandler extends (
  context: TContext,
  ...args: infer Args
) => Promise<infer R>
  ? Args extends []
    ? (ctx: restate.ObjectContext) => Promise<R>
    : Args extends [infer Arg]
      ? (ctx: restate.ObjectContext, arg: Arg) => Promise<R>
      : Args extends [infer Arg1, infer Arg2]
        ? (ctx: restate.ObjectContext, arg1: Arg1, arg2: Arg2) => Promise<R>
        : never
  : never;

// Handler transformation types for Service handlers
export type TransformServiceHandler<TContext, THandler> = THandler extends (
  context: TContext,
  ...args: infer Args
) => Promise<infer R>
  ? Args extends []
    ? (ctx: restate.Context) => Promise<R>
    : Args extends [infer Arg]
      ? (ctx: restate.Context, arg: Arg) => Promise<R>
      : Args extends [infer Arg1, infer Arg2]
        ? (ctx: restate.Context, arg1: Arg1, arg2: Arg2) => Promise<R>
        : never
  : never;

// Handler transformation types for Workflow handlers
export type TransformWorkflowHandler<TContext, THandler> = THandler extends (
  context: TContext,
  ...args: infer Args
) => Promise<infer R>
  ? Args extends []
    ? (ctx: restate.WorkflowContext) => Promise<R>
    : Args extends [infer Arg]
      ? (ctx: restate.WorkflowContext, arg: Arg) => Promise<R>
      : Args extends [infer Arg1, infer Arg2]
        ? (ctx: restate.WorkflowContext, arg1: Arg1, arg2: Arg2) => Promise<R>
        : never
  : never;

// Handler transformation types for Workflow shared handlers
export type TransformWorkflowSharedHandler<TContext, THandler> =
  THandler extends (context: TContext, ...args: infer Args) => Promise<infer R>
    ? Args extends []
      ? (ctx: restate.WorkflowSharedContext) => Promise<R>
      : Args extends [infer Arg]
        ? (ctx: restate.WorkflowSharedContext, arg: Arg) => Promise<R>
        : Args extends [infer Arg1, infer Arg2]
          ? (
              ctx: restate.WorkflowSharedContext,
              arg1: Arg1,
              arg2: Arg2,
            ) => Promise<R>
          : never
    : never;

// Base handler type that all handlers must conform to
export type BaseHandler<TContext> = (
  context: TContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<any>;

// Handler collection type
export type HandlerCollection<TContext> = {
  [key: string]: BaseHandler<TContext>;
};
