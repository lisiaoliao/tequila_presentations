import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeModules =
  process.env.CODEX_NODE_MODULES ??
  "/Users/aoliao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";

const links = [
  ["@oai/artifact-tool", path.join(runtimeModules, "@oai", "artifact-tool")],
  ["lucide", path.join(runtimeModules, "lucide")],
];

async function exists(file) {
  try {
    await fs.lstat(file);
    return true;
  } catch {
    return false;
  }
}

for (const [pkg, target] of links) {
  if (!(await exists(target))) {
    throw new Error(`Codex runtime package not found: ${target}`);
  }

  const linkPath = path.join(root, "node_modules", ...pkg.split("/"));
  await fs.mkdir(path.dirname(linkPath), { recursive: true });

  if (await exists(linkPath)) {
    await fs.rm(linkPath, { force: true, recursive: true });
  }

  await fs.symlink(target, linkPath);
  console.log(`${pkg} -> ${target}`);
}
