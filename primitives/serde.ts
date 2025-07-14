import type { Serde } from "@restatedev/restate-sdk";

export const superjsonserde = {
  contentType: "application/json",
  serialize<T>(value: T): Uint8Array {
    const jsonString = JSON.stringify(value);
    const bytes = new TextEncoder().encode(jsonString);
    return bytes;
  },
  deserialize<T>(bytes: Uint8Array): T {
    const jsonString = new TextDecoder().decode(bytes);
    const value = JSON.parse(jsonString) as T;
    return value;
  },
};

export class SuperJsonSerde<T> implements Serde<T> {
  contentType = "application/json";

  deserialize(bytes: Uint8Array): T {
    const jsonString = new TextDecoder().decode(bytes);
    return JSON.parse(jsonString) as T;
  }

  serialize(value: T): Uint8Array {
    const jsonString = JSON.stringify(value);
    return new TextEncoder().encode(jsonString);
  }
}
