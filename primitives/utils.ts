import * as restate from "@restatedev/restate-sdk";

// Common types
export type SerdeOption<T> = "json" | "superjson" | restate.Serde<T>;

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

// Run types and function
export type RunFunc<T> = () => Promise<T>;
export type RunOpts<T> = BaseOpts<T> & Omit<restate.RunOptions<T>, "serde">;

export const run = <T>(
  ctx: restate.Context,
  name: string,
  action: RunFunc<T>,
  serde: restate.Serde<T>,
  opts?: RunOpts<T>,
) =>
  ctx.run<T>(name, action, {
    ...opts,
    serde,
  });

// Get function
export const get = <T>(ctx: GetContext, key: string, serde: restate.Serde<T>) =>
  ctx.get<T>(key, serde);

// Set function
export const set = <T>(
  ctx: SetContext,
  key: string,
  value: T,
  serde: restate.Serde<T>,
) => ctx.set(key, value, serde);
