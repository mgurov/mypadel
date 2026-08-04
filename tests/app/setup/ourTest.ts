import { mergeTests } from "@playwright/test";
import { wordlyTest } from "./wordlyTest";
import { credentialsTest } from "./credentialsFixture";

export const test = mergeTests(
  wordlyTest,
  credentialsTest,
);

export { expect } from "@playwright/test";
