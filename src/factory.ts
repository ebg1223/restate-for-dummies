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
import { createEventObject } from "./typed-event-object";

import type { EventSourcedState, EventUnion } from "./typed-event-object";

export class RestateClient {
  private SerdeClass: new <T>() => Serde<T>;
  private url: string;

  constructor({
    SerdeClass = restate.serde.JsonSerde as new <T>() => Serde<T>,
    restateUrl,
  }: {
    SerdeClass?: new <T>() => Serde<T>;
    restateUrl?: string;
  } = {}) {
    this.SerdeClass = SerdeClass;
    this.url = restateUrl ?? process.env.RESTATE_URL ?? "http://localhost:8080";
  }

  createObject = <T>(name: string) => typedObject<T>(name, this.SerdeClass);
  createService = (name: string) => typedService(name, this.SerdeClass);
  createWorkflow = <T>(name: string) => typedWorkflow<T>(name, this.SerdeClass);
  createEventHandler = <T extends Record<string, any>>(name: string) =>
    createEventObject<T>(name, this.SerdeClass);

  // Direct client methods with proper generic types
  serviceClient = <T>(
    service: ServiceDefinition<string, T>,
  ): IngressClient<T> => {
    return createServiceClient<T>(service, new this.SerdeClass(), this.url);
  };

  serviceSendClient = <T>(
    service: ServiceDefinition<string, T>,
  ): IngressSendClient<T> => {
    return createServiceSendClient<T>(service, new this.SerdeClass(), this.url);
  };

  objectClient = <T>(
    object: VirtualObjectDefinition<string, T>,
    key: string,
  ): IngressClient<T> => {
    return createObjectClient<T>(object, key, new this.SerdeClass(), this.url);
  };

  objectSendClient = <T>(
    object: VirtualObjectDefinition<string, T>,
    key: string,
  ): IngressSendClient<T> => {
    return createObjectSendClient<T>(
      object,
      key,
      new this.SerdeClass(),
      this.url,
    );
  };

  workflowClient = <T>(
    workflow: WorkflowDefinition<string, T>,
    key: string,
  ): IngressWorkflowClient<T> => {
    return createWorkflowClient<T>(
      workflow,
      key,
      new this.SerdeClass(),
      this.url,
    );
  };

  workflowSendClient = <T>(
    workflow: WorkflowDefinition<string, T>,
    key: string,
  ): IngressWorkflowClient<T> => {
    return createWorkflowSendClient<T>(
      workflow,
      key,
      new this.SerdeClass(),
      this.url,
    );
  };
}
