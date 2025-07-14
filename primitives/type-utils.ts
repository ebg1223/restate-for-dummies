import type { 
  Context, 
  ObjectContext, 
  WorkflowContext, 
  WorkflowSharedContext 
} from "@restatedev/restate-sdk";

/**
 * Unified handler transformation utility
 * Transforms a handler function from one context type to another while preserving arguments and return type
 */
export type TransformHandler<TFromContext, TToContext, THandler> = 
  THandler extends (ctx: TFromContext, ...args: infer Args) => infer R
    ? (ctx: TToContext, ...args: Args) => R
    : never;

/**
 * Transform all handlers in an object from one context type to another
 */
export type TransformHandlers<TFromContext, TToContext, THandlers> = {
  [K in keyof THandlers]: TransformHandler<TFromContext, TToContext, THandlers[K]>
};

/**
 * Extract handler function type (args and return) without context
 */
export type ExtractHandlerSignature<T> = T extends (ctx: any, ...args: infer Args) => infer R
  ? (...args: Args) => R
  : never;

/**
 * Transform handlers to client methods by removing context parameter
 */
export type HandlersToClient<THandlers> = {
  [K in keyof THandlers]: ExtractHandlerSignature<THandlers[K]>
};

/**
 * Base handler constraint - all handlers must follow this pattern
 */
export type BaseHandler<TContext = any> = (
  context: TContext,
  ...args: any[]
) => Promise<any>;

/**
 * Handler collection constraint
 */
export type HandlerCollection<TContext = any> = Record<string, BaseHandler<TContext>>;

/**
 * Map Restate SDK context types to our wrapped context types
 */
export type ContextTypeMap = {
  service: [Context, import("./typed-service").ServiceHandlerContext];
  object: [ObjectContext, import("./typed-object").HandlerContext<any>];
  workflow: [WorkflowContext, import("./typed-workflow").WorkflowHandlerContext<any>];
  workflowShared: [WorkflowSharedContext, import("./typed-workflow").WorkflowSharedHandlerContext<any>];
};

/**
 * Infer the appropriate transform based on primitive type
 */
export type InferTransform<
  TPrimitive extends keyof ContextTypeMap,
  THandlers
> = TransformHandlers<
  ContextTypeMap[TPrimitive][1],
  ContextTypeMap[TPrimitive][0],
  THandlers
>;

/**
 * Utility to check if a value has a specific property
 * Useful for type guards without instanceof
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return obj != null && typeof obj === 'object' && key in obj;
}

/**
 * Type guard for checking if an object matches expected shape
 */
export function isObjectWithMethods<T extends Record<string, (...args: any[]) => any>>(
  obj: unknown,
  methods: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== 'object') return false;
  return methods.every(method => 
    method in obj && typeof (obj as any)[method] === 'function'
  );
}