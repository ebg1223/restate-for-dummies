import * as restate from "@restatedev/restate-sdk";

// Common types

export type BaseOpts<T> = {
  serde?: SerdeOption<T>;
};

// Context types
export type SetContext = restate.ObjectContext | restate.WorkflowContext;
export type GetContext = (
  | restate.ObjectSharedContext
  | restate.WorkflowSharedContext
) &
  SetContext;

// Helper to resolve serde option
function resolveSerde<T>(opts?: BaseOpts<T>): restate.Serde<T> | undefined {
  if (!opts?.serde || opts.serde === "superjson") {
    return superjsonserde;
  }
  if (opts.serde === "json") {
    return undefined;
  }
  return opts.serde;
}

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
    serde: resolveSerde(opts),
  });

// Get function
export const get = <T>(ctx: GetContext, key: string, opts?: BaseOpts<T>) =>
  ctx.get<T>(key, resolveSerde(opts));

// Set function
export const set = <T>(
  ctx: SetContext,
  key: string,
  value: T,
  opts?: BaseOpts<T>,
) => ctx.set(key, value, resolveSerde(opts));
