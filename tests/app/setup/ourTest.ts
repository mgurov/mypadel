import { mergeTests } from "@playwright/test";
import { wordlyTest } from "./wordlyTest";

export const test = mergeTests(
  wordlyTest,
);

export { expect } from "@playwright/test";
