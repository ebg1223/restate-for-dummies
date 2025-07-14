import type { Client, SendClient, Serde } from "@restatedev/restate-sdk";
import type {
  IngressClient,
  IngressSendClient,
  IngressWorkflowClient,
} from "@restatedev/restate-sdk-clients";

import { Opts, rpc, SendOpts } from "@restatedev/restate-sdk";
import {
  Opts as IngressOpts,
  rpc as ingressRpc,
  SendOpts as IngressSendOpts,
} from "@restatedev/restate-sdk-clients";

// Type for function arguments
type Args = readonly unknown[];

// Type for RPC modules
type RpcModule = typeof ingressRpc | typeof rpc;

// Type for options getter functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OptsGetter<T> = (opts: T) => any;

/**
 * Type guard to check if an object is an Opts instance from restate-sdk
 */
function isOpts(obj: unknown): obj is Opts<unknown, unknown> {
  return obj instanceof Opts;
}

/**
 * Type guard to check if an object is a SendOpts instance from restate-sdk
 */
function isSendOpts(obj: unknown): obj is SendOpts<unknown> {
  return obj instanceof SendOpts;
}

/**
 * Type guard to check if an object is an Opts instance from restate-sdk-clients
 */
function isIngressOpts(obj: unknown): obj is IngressOpts<unknown, unknown> {
  return obj instanceof IngressOpts;
}

/**
 * Type guard to check if an object is a SendOpts instance from restate-sdk-clients
 */
function isIngressSendOpts(obj: unknown): obj is IngressSendOpts<unknown> {
  return obj instanceof IngressSendOpts;
}

/**
 * Generic factory for creating argument handlers
 */
function createArgsHandler<T>(
  rpcModule: RpcModule,
  optsType: "call" | "send",
  typeGuard: (obj: unknown) => obj is T,
  getExistingOpts: OptsGetter<T>,
) {
  return (args: Args, serde: Serde<unknown>): Args => {
    // Handle empty args by adding empty object
    if (args.length === 0) {
      const opts =
        optsType === "call"
          ? rpcModule.opts({ input: serde, output: serde })
          : rpcModule.sendOpts({ input: serde });
      return [{}, opts];
    }

    const lastArg = args[args.length - 1];

    // Check if last arg is already opts using type guard
    if (typeGuard(lastArg)) {
      const existingOpts = getExistingOpts(lastArg);
      const mergedOpts =
        optsType === "call"
          ? rpcModule.opts({
              ...existingOpts,
              input: existingOpts.input || serde,
              output: existingOpts.output || serde,
            })
          : rpcModule.sendOpts({
              ...existingOpts,
              input: existingOpts.input || serde,
            });
      return [...args.slice(0, -1), mergedOpts];
    }

    // No opts provided - append new opts
    const opts =
      optsType === "call"
        ? rpcModule.opts({ input: serde, output: serde })
        : rpcModule.sendOpts({ input: serde });
    return [...args, opts];
  };
}

/**
 * Create argument handlers using the factory
 */
const handleCallArgs = createArgsHandler(
  rpc,
  "call",
  isOpts,
  (opts: Opts<unknown, unknown>) => opts.getOpts(),
);

const handleSendArgs = createArgsHandler(
  rpc,
  "send",
  isSendOpts,
  (opts: SendOpts<unknown>) => opts.getOpts(),
);

const handleIngressCallArgs = createArgsHandler(
  ingressRpc,
  "call",
  isIngressOpts,
  (opts: IngressOpts<unknown, unknown>) => opts.opts,
);

const handleIngressSendArgs = createArgsHandler(
  ingressRpc,
  "send",
  isIngressSendOpts,
  (opts: IngressSendOpts<unknown>) => opts.opts,
);

/**
 * Generic factory for creating client wrappers
 */
function createClientWrapper<T>(
  client: T,
  serde: Serde<unknown>,
  argsHandler: (args: Args, serde: Serde<unknown>) => Args,
  preserveThis: boolean = false,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy(client as any, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // If it's not a function, return it as-is
      if (typeof value !== "function") {
        return value;
      }

      // Return a wrapped function that injects serde
      if (preserveThis) {
        return function (this: unknown, ...args: Args) {
          const processedArgs = argsHandler(args, serde);
          return value.apply(this || target, processedArgs as unknown[]);
        };
      } else {
        return (...args: Args) => {
          const processedArgs = argsHandler(args, serde);
          return value.apply(target, processedArgs as unknown[]);
        };
      }
    },
  }) as T;
}

/**
 * Wraps a client to automatically inject serde configuration
 */
export function wrapClient<THandlers>(
  client: Client<THandlers>,
  serde: Serde<unknown>,
): Client<THandlers> {
  return createClientWrapper(client, serde, handleCallArgs);
}

/**
 * Wraps a send client to automatically inject serde configuration
 */
export function wrapSendClient<THandlers>(
  client: SendClient<THandlers>,
  serde: Serde<unknown>,
): SendClient<THandlers> {
  return createClientWrapper(client, serde, handleSendArgs);
}

/**
 * Wraps an ingress client to automatically inject serde configuration
 */
export function wrapIngressClient<T>(
  client: IngressClient<T>,
  serde: Serde<unknown>,
): IngressClient<T> {
  return createClientWrapper(client, serde, handleIngressCallArgs, true);
}

/**
 * Wraps an ingress workflow client to automatically inject serde configuration
 */
export function wrapIngressWorkflowClient<T>(
  client: IngressWorkflowClient<T>,
  serde: Serde<unknown>,
): IngressWorkflowClient<T> {
  return createClientWrapper(client, serde, handleIngressCallArgs);
}

/**
 * Wraps an ingress send client to automatically inject serde configuration
 */
export function wrapIngressSendClient<T>(
  client: IngressSendClient<T>,
  serde: Serde<unknown>,
): IngressSendClient<T> {
  return createClientWrapper(client, serde, handleIngressSendArgs);
}
