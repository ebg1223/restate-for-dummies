import { createRestateFactory, type Serde } from "../primitives";

/**
 * Simple example showing the minimal setup needed to use restate-for-dummies
 */

// Step 1: Implement a basic JSON serde
const jsonSerde: Serde<any> = {
  contentType: "application/json",
  serialize: (value) => new TextEncoder().encode(JSON.stringify(value)),
  deserialize: (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
};

// Step 2: Create the factory
const restate = createRestateFactory({ serde: jsonSerde });

// Step 3: Define your service
const greetingService = restate.service("GreetingService", {
  greet: async ({ ctx }, name: string): Promise<string> => {
    return `Hello, ${name}!`;
  },

  greetMany: async ({ ctx }, names: string[]): Promise<string[]> => {
    // For this example, just greet each name directly
    // Avoid circular reference by not calling service(greetingService)
    return names.map((name) => `Hello, ${name}!`);
  },
});

// Step 4: Define an object with state
interface GreetingCounterState {
  greetCount: number;
}

// Using the builder API for better type inference
const greetingCounter = restate
  .objectWithState<GreetingCounterState>("GreetingCounter")
  .handlers({
    recordGreeting: async ({ getState, setState, service }) => {
      const count = (await getState("greetCount")) ?? 0;
      await setState("greetCount", count + 1);
      return count + 1;
    },

    getCount: async ({ getState }) => {
      return (await getState("greetCount")) ?? 0;
    },
  });

const greetingWorkflow = restate.workflow("GreetingWorkflow", {
  run: async ({ ctx }, name: string): Promise<string> => {
    return `Hello, ${name}!`;
  },

  greetMany: async ({ ctx }, names: string[]) => {
    // For this example, just greet each name directly
    // Avoid circular reference by not calling service(greetingService)
    return names.map((name) => `Hello, ${name}!`);
  },
});

// Step 5: Export for registration with Restate
export { greetingService, greetingCounter };

const clients = restate.standaloneClients("asdf");
