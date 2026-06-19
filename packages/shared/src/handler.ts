import { z } from "zod";
import { Contract, RouteDefinition } from "./contract.js";

type InferParams<R extends RouteDefinition> = R["params"] extends z.ZodType
  ? z.infer<R["params"]>
  : Record<string, never>;

type InferBody<R extends RouteDefinition> = R["body"] extends z.ZodType
  ? z.infer<R["body"]>
  : undefined;

type InferResponse<R extends RouteDefinition> = z.infer<R["response"]>;

export interface HandlerContext<R extends RouteDefinition> {
  params: InferParams<R>;
  body: InferBody<R>;
  user: { uid: string; email: string };
}

export type RouteHandlers = {
  [K in keyof Contract]: (
    ctx: HandlerContext<Contract[K]>
  ) => Promise<InferResponse<Contract[K]>>;
};
