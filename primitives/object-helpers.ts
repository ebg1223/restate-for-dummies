import type { HandlerContext } from "./typed-object";

/**
 * Helper type to infer object handlers from a handler definition
 * This works around TypeScript's limitation with partial type parameter inference
 */
export type InferObjectHandlers<
  State,
  HandlerDef extends Record<string, any>
> = {
  [K in keyof HandlerDef]: HandlerDef[K] extends (
    context: HandlerContext<State>,
    ...args: infer Args
  ) => Promise<infer R>
    ? (context: HandlerContext<State>, ...args: Args) => Promise<R>
    : never;
};

/**
 * Helper to create properly typed handlers
 * Usage:
 * const handlers = objectHandlers<State>()({
 *   increment: async ({ getState, setState }) => { ... }
 * })
 */
export function objectHandlers<State>() {
  return <
    Handlers extends Record<
      string,
      (context: HandlerContext<State>, ...args: any[]) => Promise<any>
    >
  >(
    handlers: Handlers
  ): Handlers => handlers;
}