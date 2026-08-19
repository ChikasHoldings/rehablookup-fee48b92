/**
 * Node ESM resolver hook that teaches `--experimental-strip-types` to
 * follow the import styles this codebase's `src/` actually uses.
 *
 * The generators read shipped `.ts` data directly rather than keeping a
 * duplicate copy — that is the whole reason the content is trustworthy.
 * But two of Vite's conveniences are invisible to Node:
 *
 *   `@/data/x`   the tsconfig path alias for `src/`
 *   `./x`        an extensionless relative import
 *
 * Node ESM resolves neither, so a data file that imports a sibling
 * (providerBenchmarkConfigs → providerBusinessConfigs) fails outright.
 * This hook resolves both and otherwise defers, so anything already
 * resolvable keeps its normal resolution.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".mjs", ".js", "/index.ts", "/index.tsx"];

function firstExisting(basePath) {
  if (existsSync(basePath) && path.extname(basePath)) return basePath;
  for (const ext of EXTENSIONS) {
    const candidate = basePath + ext;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const hit = firstExisting(path.join(SRC, specifier.slice(2)));
    if (hit) return next(pathToFileURL(hit).href, context);
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const parent = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const hit = firstExisting(path.resolve(parent, specifier));
    if (hit) return next(pathToFileURL(hit).href, context);
  }

  return next(specifier, context);
}
