import type { VirtualObjectDefinition } from "@restatedev/restate-sdk";
import * as restate from "@restatedev/restate-sdk";
import { typedObject } from "./typed-object";
import type { ObjectHandlerContext } from "./typed-object";

// Base event type that all events will extend
type BaseEvent<TEventMap, K extends keyof TEventMap> = {
  event: K;
  data: TEventMap[K];
  timestamp?: number;
};

// Convert event map to discriminated union
export type EventUnion<TEventMap> = {
  [K in keyof TEventMap]: BaseEvent<TEventMap, K>;
}[keyof TEventMap];

// State type for event sourced objects
export type EventSourcedState<TEventMap> = {
  events: EventUnion<TEventMap>[];
};

// Create an event-sourced object with automatic event storage
export function createEventObject<TEventMap extends Record<string, any>>(
  name: string,
  SerdeClass: new <T>() => restate.Serde<T>,
) {
  // Infer the state type from the events
  type State = EventSourcedState<TEventMap>;

  // Handler type that accepts the event data for a specific event
  type HandlerMap = {
    [K in keyof TEventMap]: (
      context: ObjectHandlerContext<State>,
      data: TEventMap[K],
    ) => Promise<void>;
  };

  return (handlers: HandlerMap): VirtualObjectDefinition<string, any> => {
    // Create wrapped handlers that automatically append events
    const wrappedHandlers = {} as any;

    for (const [eventName, handler] of Object.entries(handlers)) {
      wrappedHandlers[eventName] = async (
        context: ObjectHandlerContext<State>,
        data: any,
      ) => {
        // Execute the user's handler
        await handler(context, data);

        // Automatically append the event to the events list
        const eventsList = (await context.getState("events")) ?? [];
        const event: EventUnion<TEventMap> = {
          event: eventName as keyof TEventMap,
          data,
          timestamp: context.ctx.date.now(),
        } as any;

        context.setState("events", [...eventsList, event]);
      };
    }

    // Use the existing typedObject function with wrapped handlers
    return typedObject<State>(name, SerdeClass)(wrappedHandlers);
  };
}

// Helper to get the inferred event type from an event object
export type InferEventType<T> =
  T extends Record<string, any> ? EventUnion<T> : never;

// Helper to get the inferred state type from an event object
export type InferEventState<T> =
  T extends Record<string, any> ? EventSourcedState<T> : never;
