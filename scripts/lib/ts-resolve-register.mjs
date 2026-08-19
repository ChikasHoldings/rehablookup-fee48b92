/**
 * Entry point for `node --import ./scripts/lib/ts-resolve-register.mjs`.
 * Registers the resolver hook in ./ts-resolve-hook.mjs — see that file
 * for why it is needed.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-resolve-hook.mjs", pathToFileURL(import.meta.filename));
