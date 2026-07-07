import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "templates", "转正答辩_千问模板_原始效果.pptx");
const out = process.env.PPTX_OUT
  ? path.resolve(process.env.PPTX_OUT)
  : path.join(root, "output", "转正答辩_千问模板.pptx");

await fs.mkdir(path.dirname(out), { recursive: true });
await fs.copyFile(source, out);

console.log(out);
