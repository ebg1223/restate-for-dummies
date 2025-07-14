import { getRestate } from "./primitives";

const factest = getRestate();

const obj = factest.createObject<{
  num: number;
}>("hi")({
  hi: async ({ ctx, setState, getState }) => {
    setState("num", 1);
    const n = await getState("num");
    return n;
  },
});

const serv = factest.createService("hi")({
  hi: async ({ ctx, object, runStep, service }) => {
    console.log("hi");
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
