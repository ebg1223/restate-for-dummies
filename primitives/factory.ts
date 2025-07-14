import type { Serde, ServiceHandler } from "@restatedev/restate-sdk";
import { typedObject } from "./typed-object";
import { typedService, type ServiceHandlers } from "./typed-service";
import { typedWorkflow } from "./typed-workflow";
import { SuperJsonSerde } from "./serde";
import {
  createObjectClient,
  createServiceClient,
  createWorkflowClient,
} from "./standalone-clients";
import { standaloneServiceClient } from ".";
import { run } from "./utils";

export function getRestate(serde: new () => Serde<any>) {
  const createObject = <T>(name: string) => typedObject<T>(name, serde);
  const createService = <THandlers extends ServiceHandlers>(
    name: string,
    handlers: THandlers,
  ) => typedService<THandlers>(name, handlers, serde);
  const createWorkflow = <T>(name: string) => typedWorkflow<T>(name, serde);

  return {
    createObject,
    createService,
    createWorkflow,
  } as const;
}

const factest = getRestate(SuperJsonSerde);

const obj = factest.createObject<{
  num: number;
}>("hi")({
  hi: async ({ ctx, setState, getState }) => {
    setState("num", 1);
    const n = await getState("num");
    return n;
  },
});

const serv = factest.createService("hi", {
  hi: async ({ ctx }) => {
    console.log("hi");
    return "HIHI";
  },
});

const workflow = factest.createWorkflow<{
  hi: string;
}>("workflow")({
  run: async ({ ctx, setState }) => {
    setState("hi", "hello");
    return true;
  },
  hi: async ({ ctx, getState }) => {
    const n = await getState("hi");
    return n;
  },
});
