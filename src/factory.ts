import type {
  Serde,
  ServiceDefinition,
  VirtualObjectDefinition,
  WorkflowDefinition,
} from "@restatedev/restate-sdk";
import type {
  IngressClient,
  IngressSendClient,
  IngressWorkflowClient,
} from "@restatedev/restate-sdk-clients";
import { typedObject } from "./typed-object";
import { typedService } from "./typed-service";
import { typedWorkflow } from "./typed-workflow";

import {
  createObjectClient,
  createObjectSendClient,
  createServiceClient,
  createWorkflowClient,
  createServiceSendClient,
  createWorkflowSendClient,
} from "./standalone-clients";
import * as restate from "@restatedev/restate-sdk-clients";

export function getRestate({
  SerdeClass = restate.serde.JsonSerde<any> as new () => Serde<any>,
  restateUrl,
}: {
  SerdeClass?: new () => Serde<any>;
  restateUrl?: string;
} = {}) {
  const url = restateUrl ?? process.env.RESTATE_URL ?? "http://localhost:8080";
  const createObject = <T>(name: string) => typedObject<T>(name, SerdeClass);
  const createService = (name: string) => typedService(name, SerdeClass);
  const createWorkflow = <T>(name: string) =>
    typedWorkflow<T>(name, SerdeClass);

  const standaloneClients = {
    service: <T>(service: ServiceDefinition<string, T>) =>
      createServiceClient<T>(service, new SerdeClass(), url),

    serviceSend: <T>(service: ServiceDefinition<string, T>) =>
      createServiceSendClient<T>(service, new SerdeClass(), url),

    object: <T>(object: VirtualObjectDefinition<string, T>, key: string) =>
      createObjectClient<T>(object, key, new SerdeClass(), url),

    objectSend: <T>(object: VirtualObjectDefinition<string, T>, key: string) =>
      createObjectSendClient<T>(object, key, new SerdeClass(), url),

    workflow: <T>(workflow: WorkflowDefinition<string, T>, key: string) =>
      createWorkflowClient<T>(workflow, key, new SerdeClass(), url),

    workflowSend: <T>(workflow: WorkflowDefinition<string, T>, key: string) =>
      createWorkflowSendClient<T>(workflow, key, new SerdeClass(), url),
  };

  return {
    createObject,
    createService,
    createWorkflow,
    standaloneClients,
  } as const;
}

export type RestateFactoryReturn = ReturnType<typeof getRestate>;
