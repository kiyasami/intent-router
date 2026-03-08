import { IntentRouter } from "../../../packages/core/src";
import { commands } from "./commands";

export const router = new IntentRouter({
  dimension: 1024,
  commands,
});
