import * as restate from "@restatedev/restate-sdk";
import type { Serde } from "@restatedev/restate-sdk-core";

// Common types

export type BaseOpts<T> = {
  serde?: Serde<T>;
};

// Context types
export type SetContext = restate.ObjectContext | restate.WorkflowContext;
export type GetContext = (
  | restate.ObjectSharedContext
  | restate.WorkflowSharedContext
) &
  SetContext;

// Run types and function
export type RunFunc<T> = () => Promise<T>;
export type RunOpts<T> = BaseOpts<T> & Omit<restate.RunOptions<T>, "serde">;

export const run = <T>(
  ctx: restate.Context,
  name: string,
  action: RunFunc<T>,
  opts?: RunOpts<T>,
) =>
  ctx.run<T>(name, action, {
    ...opts,
    serde: opts?.serde,
  });

// Get function
export const get = <T>(ctx: GetContext, key: string, opts?: BaseOpts<T>) =>
  ctx.get<T>(key, opts?.serde);

// Set function
export const set = <T>(
  ctx: SetContext,
  key: string,
  value: T,
  opts?: BaseOpts<T>,
) => ctx.set(key, value, opts?.serde);
