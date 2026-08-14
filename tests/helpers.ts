import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.*s");

export function makeTest() {
  return convexTest({ schema, modules });
}

export { api };
