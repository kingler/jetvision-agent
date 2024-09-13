import { models } from "@/lib/types";
import { constants } from "./constants";
import { docs } from "./docs";
import { examplePrompts } from "./example-prompts";
import { links } from "./links";
import { defaultPreferences } from "./preferences";
import * as prompts from "./prompts";

const configs = {
  version: "0.0.1",
  ...links,
  ...prompts,
  ollamaTagsEndpoint: "/api/tags",
};

export { configs, constants, defaultPreferences, docs, examplePrompts, models };
