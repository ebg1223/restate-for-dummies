import { createRestateFactory, type Serde } from "../primitives";
// import superjson from "superjson";

/**
 * Example showing how to integrate the popular superjson library
 * as a serde implementation for restate-for-dummies
 * 
 * First install superjson:
 * bun add superjson
 */

// Create a Serde implementation using superjson
class SuperJSONSerde implements Serde<any> {
  contentType = "application/json";

  serialize(value: any): Uint8Array {
    // const serialized = superjson.stringify(value);
    // return new TextEncoder().encode(serialized);
    throw new Error("Install superjson to use this example");
  }

  deserialize(bytes: Uint8Array): any {
    // const text = new TextDecoder().decode(bytes);
    // return superjson.parse(text);
    throw new Error("Install superjson to use this example");
  }
}

// Create the factory with SuperJSON serde
const restate = createRestateFactory({
  serde: new SuperJSONSerde(),
});

// Now you can use all JavaScript types that SuperJSON supports:
// - Date
// - RegExp  
// - Set
// - Map
// - BigInt
// - undefined
// - Error objects
// - URL objects
// - and more...

interface RichDataExample {
  id: string;
  createdAt: Date;
  tags: Set<string>;
  metadata: Map<string, any>;
  pattern: RegExp;
  bigNumber: bigint;
  optional?: string;
  error?: Error;
  website?: URL;
}

const dataService = restate.service("DataService", {
  processRichData: async ({ ctx }, data: RichDataExample) => {
    console.log("Processing data with rich types:", {
      hasDate: data.createdAt instanceof Date,
      hasSet: data.tags instanceof Set,
      hasMap: data.metadata instanceof Map,
      hasRegExp: data.pattern instanceof RegExp,
      hasBigInt: typeof data.bigNumber === "bigint",
      hasUndefined: data.optional === undefined,
      hasError: data.error instanceof Error,
      hasURL: data.website instanceof URL,
    });

    // All types are properly preserved through serialization
    return {
      ...data,
      processedAt: new Date(),
    };
  },
});

// Example usage
const exampleData: RichDataExample = {
  id: "123",
  createdAt: new Date(),
  tags: new Set(["important", "urgent"]),
  metadata: new Map<string, any>([
    ["author", "John Doe"],
    ["version", 2],
  ]),
  pattern: /test-\d+/gi,
  bigNumber: BigInt("9007199254740992"), // Larger than Number.MAX_SAFE_INTEGER
  optional: undefined,
  error: new Error("Example error"),
  website: new URL("https://example.com"),
};

export { dataService, exampleData };