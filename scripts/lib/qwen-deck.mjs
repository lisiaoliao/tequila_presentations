import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";
import { mergePptxPackages } from "./pptx-package-merge.mjs";

const execFileAsync = promisify(execFile);

export const W = 1280;
export const H = 720;
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SOURCE = path.join(ROOT, "templates", "转正答辩_千问模板_原始效果.pptx");
export const OUTPUT_DIR = path.join(ROOT, "output");
export const SECTION_OUTPUT_DIR = path.join(OUTPUT_DIR, "sections");
export const PREVIEW_DIR = path.join(ROOT, "preview");
export const SECTION_PREVIEW_DIR = path.join(PREVIEW_DIR, "sections");
export const FINAL_OUT = process.env.PPTX_OUT
  ? path.resolve(process.env.PPTX_OUT)
  : path.join(OUTPUT_DIR, "转正答辩_千问模板.pptx");
export const DEFAULT_FINAL_OUT = path.join(OUTPUT_DIR, "转正答辩_千问模板.pptx");

export const SECTION_CONFIGS = [
  {
    id: "01",
    slug: "intro",
    label: "个人介绍",
    slides: [1, 3],
    script: "build-01-intro.mjs",
    filename: "01-个人介绍.pptx",
  },
  {
    id: "02",
    slug: "background",
    label: "背景与目标",
    slides: [4, 6],
    script: "build-02-background.mjs",
    filename: "02-背景与目标.pptx",
  },
  {
    id: "03",
    slug: "cases",
    label: "工作产出与案例",
    slides: [7, 15],
    script: "build-03-cases.mjs",
    filename: "03-工作产出与案例.pptx",
  },
  {
    id: "04",
    slug: "main-work",
    label: "主要工作",
    slides: [16, 28],
    script: "build-04-main-work.mjs",
    filename: "04-主要工作.pptx",
  },
  {
    id: "05",
    slug: "review",
    label: "效果与复盘",
    slides: [29, 33],
    script: "build-05-review.mjs",
    filename: "05-效果与复盘.pptx",
  },
];

const C = {
  qwen: "#635BFF",
  blue: "#00A8FF",
  navy: "#14113D",
  white: "#FFFFFF",
};

export function getSectionConfig(sectionId) {
  const section = SECTION_CONFIGS.find((item) => item.id === sectionId);
  if (!section) {
    throw new Error(`Unknown section id: ${sectionId}`);
  }
  return section;
}

export function sectionOutputPath(sectionId) {
  return path.join(SECTION_OUTPUT_DIR, getSectionConfig(sectionId).filename);
}

export function sectionPreviewPath(sectionId) {
  const section = getSectionConfig(sectionId);
  return path.join(SECTION_PREVIEW_DIR, `${section.id}-${section.slug}`);
}

async function readBlob(file) {
  const bytes = await fs.readFile(file);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function shape(slide, geometry, position, opts = {}) {
  return slide.shapes.add({
    geometry,
    position,
    fill: opts.fill ?? C.white,
    line: opts.line ?? noLine(),
    shadow: opts.shadow ?? "shadow-none",
  });
}

function text(slide, value, position, opts = {}) {
  const t = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: noLine(),
  });
  t.text = value;
  t.text.style = {
    fontSize: opts.size ?? 18,
    bold: opts.bold ?? false,
    color: opts.color ?? C.white,
    typeface: opts.font ?? "PingFang SC",
    alignment: opts.align,
    wrap: "square",
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return t;
}

function image(slide, blob, position, alt, opts = {}) {
  return slide.images.add({
    blob,
    contentType: "image/png",
    alt,
    fit: opts.fit ?? "contain",
    position,
  });
}

function dividerSlide(slide, logoBytes, bgBytes, sec, title, subtitle) {
  slide.background.fill = C.navy;
  image(slide, bgBytes, { left: 0, top: 0, width: W, height: H }, "Qwen background", { fit: "cover" });
  shape(slide, "rect", { left: 0, top: 0, width: W, height: H }, { fill: "#14113DCC" });
  shape(slide, "rect", { left: 860, top: 0, width: 420, height: H }, { fill: C.qwen });

  image(slide, logoBytes, { left: 76, top: 78, width: 34, height: 34 }, "Qwen logo");
  text(slide, "Qwen", { left: 122, top: 82, width: 94, height: 24 }, {
    size: 18,
    bold: true,
    color: C.white,
  });

  text(slide, sec, { left: 82, top: 220, width: 160, height: 70 }, {
    size: 58,
    bold: true,
    color: "#D9D7FF",
  });
  text(slide, title, { left: 82, top: 326, width: 650, height: 54 }, {
    size: 36,
    bold: true,
    color: C.white,
  });
  text(slide, subtitle, { left: 84, top: 408, width: 620, height: 28 }, {
    size: 20,
    color: "#DDE3FF",
  });
  shape(slide, "rect", { left: 84, top: 472, width: 92, height: 5 }, { fill: C.blue });
  text(slide, "转正答辩 · 千问学习创新", { left: 82, top: 650, width: 260, height: 18 }, {
    size: 13,
    bold: true,
    color: "#F2F4FF",
  });
}

export async function createFullDeck() {
  const logoBytes = await readBlob(path.join(ROOT, "assets", "qwen", "qwen-logo.png"));
  const bgBytes = await readBlob(path.join(ROOT, "assets", "qwen", "qwen-background.png"));
  const p = await PresentationFile.importPptx(await FileBlob.load(SOURCE));
  const originalSlides = [...p.slides.items];

  const dividers = [
    {
      after: 2,
      sec: "02",
      title: "工作概况：教育 OneRec 探索",
      subtitle: "优化背景 | 问题与挑战 | 优化方案",
    },
    {
      after: 4,
      sec: "03",
      title: "工作产出与案例",
      subtitle: "能力差异点 | Demo Case | 质量验证",
    },
    {
      after: 12,
      sec: "04",
      title: "主要工作：从数据到推理闭环",
      subtitle: "Tokenizer | 训练链路 | 下游任务 | 限制性解码",
    },
    {
      after: 24,
      sec: "05",
      title: "效果与复盘",
      subtitle: "指标收益 | 问题沉淀 | 后续方向",
    },
  ];

  for (const item of dividers) {
    const { slide } = p.slides.insert({ after: originalSlides[item.after] });
    dividerSlide(slide, logoBytes, bgBytes, item.sec, item.title, item.subtitle);
  }

  return p;
}

export function keepSlideRange(presentation, start, end) {
  for (let index = presentation.slides.items.length - 1; index >= 0; index -= 1) {
    const slideNo = index + 1;
    if (slideNo < start || slideNo > end) {
      presentation.slides.remove(index);
    }
  }
}

export async function buildSectionDeck(sectionId) {
  const section = getSectionConfig(sectionId);
  const p = await createFullDeck();
  keepSlideRange(p, section.slides[0], section.slides[1]);
  return p;
}

export async function saveDeck(presentation, outPath, previewDir) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  if (previewDir) {
    await writePresentationPreview(presentation, previewDir);
  }
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outPath);
  return outPath;
}

export async function writePresentationPreview(presentation, previewDir) {
  await fs.mkdir(previewDir, { recursive: true });
  const entries = await fs.readdir(previewDir, { withFileTypes: true });
  for (const entry of entries) {
    if (path.resolve(previewDir) === PREVIEW_DIR && entry.name === "sections") {
      continue;
    }
    await fs.rm(path.join(previewDir, entry.name), { recursive: true, force: true });
  }
  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(previewDir, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
  }
  await writeBlob(path.join(previewDir, "deck-montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 1 }));
}

export async function renderPptxPreview(pptxPath, previewDir) {
  const presentation = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  await writePresentationPreview(presentation, previewDir);
}

export async function saveSectionDeck(sectionId, presentation) {
  const outPath = sectionOutputPath(sectionId);
  await saveDeck(presentation, outPath, sectionPreviewPath(sectionId));
  console.log(outPath);
  return outPath;
}

function assertFinalOverwriteAllowed(outPath) {
  const writesDefaultFinal = path.resolve(outPath) === path.resolve(DEFAULT_FINAL_OUT);
  if (writesDefaultFinal && process.env.ALLOW_FINAL_OVERWRITE !== "1") {
    throw new Error(
      [
        "Refusing to overwrite output/转正答辩_千问模板.pptx without user approval.",
        "先让奥哩奥确认各 section 局部 PPT 和 preview/sections 预览都满意。",
        "确认后再执行: ALLOW_FINAL_OVERWRITE=1 npm run combine:qwen",
      ].join("\n"),
    );
  }
}

export async function combineSectionDecks(sectionIds = SECTION_CONFIGS.map((item) => item.id), outPath = FINAL_OUT) {
  assertFinalOverwriteAllowed(outPath);
  const paths = sectionIds.map(sectionOutputPath);
  await mergePptxPackages(paths, outPath);
  try {
    await renderPptxPreview(outPath, PREVIEW_DIR);
  } catch (error) {
    console.warn(`Preview rendering skipped: ${error?.message ?? error}`);
  }
  console.log(outPath);
  return outPath;
}

export async function runSectionScript(section) {
  const scriptPath = path.join(ROOT, "scripts", "sections", section.script);
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], { cwd: ROOT });
  if (stdout.trim()) {
    console.log(stdout.trim());
  }
  if (stderr.trim()) {
    console.error(stderr.trim());
  }
}

export async function buildAllSectionDecks() {
  await fs.mkdir(SECTION_OUTPUT_DIR, { recursive: true });
  await fs.mkdir(SECTION_PREVIEW_DIR, { recursive: true });
  for (const section of SECTION_CONFIGS) {
    await runSectionScript(section);
  }
}
