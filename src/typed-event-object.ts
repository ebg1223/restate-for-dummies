import type { VirtualObjectDefinition } from "@restatedev/restate-sdk";
import * as restate from "@restatedev/restate-sdk";
import { typedObject } from "./typed-object";
import type { ObjectHandlerContext } from "./typed-object";

// Base event type that all events will extend
type BaseEvent<TEventMap, K extends keyof TEventMap> = {
  event: K;
  data: TEventMap[K];
};

// Convert event map to discriminated union
export type EventUnion<TEventMap> = {
  [K in keyof TEventMap]: BaseEvent<TEventMap, K>;
}[keyof TEventMap];

// State type for event sourced objects
export type EventSourcedState<TEventMap> = {
  events: (EventUnion<TEventMap> & {
    timestamp: number;
    uuid: string;
  })[];
};

// Combined state type that merges event state with additional state
export type CombinedEventState<
  TEventMap,
  TAdditionalState = {},
> = EventSourcedState<TEventMap> & Omit<TAdditionalState, "events">;

// Create an event-sourced object with automatic event storage
export function createEventObject<
  TEventMap extends Record<string, any>,
  TAdditionalState extends Record<string, any> = {},
>(name: string, SerdeClass: new <T>() => restate.Serde<T>) {
  // Ensure TAdditionalState doesn't have 'events' property at compile time
  type ValidatedAdditionalState = Omit<TAdditionalState, "events">;

  // Infer the combined state type
  type State = EventSourcedState<TEventMap> & ValidatedAdditionalState;

  // Handler type that accepts the event data for a specific event
  type HandlerMap = {
    [K in keyof TEventMap]: (
      context: ObjectHandlerContext<State> & {
        eventUuid: string;
        eventTimestamp: number;
      },
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
        const eventUuid = context.ctx.rand.uuidv4();
        const eventTimestamp = context.ctx.date.now();
        // Execute the user's handler
        await handler({ ...context, eventUuid, eventTimestamp }, data);

        // Automatically append the event to the events list
        const eventsList = (await context.getState("events")) ?? [];
        const event: EventSourcedState<TEventMap>["events"][number] = {
          event: eventName as keyof TEventMap,
          data,
          timestamp: eventTimestamp,
          uuid: eventUuid,
        } as any;

        const newEventsList: EventSourcedState<TEventMap>["events"] = [
          ...eventsList,
          event,
        ];
        await (context.setState as any)("events", newEventsList);
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

// Helper to get the combined state type
export type InferCombinedState<TEventMap, TAdditionalState = {}> =
  TEventMap extends Record<string, any>
    ? CombinedEventState<TEventMap, TAdditionalState>
    : never;
