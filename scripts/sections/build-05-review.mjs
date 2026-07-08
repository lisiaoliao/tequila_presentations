import fs from "node:fs/promises";
import path from "node:path";
import { Presentation } from "@oai/artifact-tool";
import { buildSectionDeck, ROOT, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("05");

// Section-specific edits for 05 思考与总结 go here.
// This section owns: divider 05, summary, appendix pages, thanks page.
function replaceExactText(slideNo, current, next) {
  const slide = deck.slides.items[slideNo - 1];
  const target = slide.shapes.items.find((shape) => String(shape.text ?? "") === current);
  if (!target) {
    throw new Error(`Could not find exact textbox text on slide ${slideNo}: ${current}`);
  }
  target.text = next;
}

function itemCenter(item) {
  const p = item.position ?? item.frame;
  if (!p) return null;
  return {
    x: Number(p.left) + Number(p.width) / 2,
    y: Number(p.top) + Number(p.height) / 2,
  };
}

function deleteObjectsInBox(slideNo, box) {
  const slide = deck.slides.items[slideNo - 1];
  for (const item of [...slide.shapes.items, ...slide.images.items]) {
    const center = itemCenter(item);
    if (
      center &&
      center.x >= box.left &&
      center.x <= box.left + box.width &&
      center.y >= box.top &&
      center.y <= box.top + box.height
    ) {
      item.delete();
    }
  }
}

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function shape(slide, geometry, position, opts = {}) {
  return slide.shapes.add({
    geometry,
    position,
    fill: opts.fill ?? "#FFFFFF",
    line: opts.line ?? noLine(),
    shadow: opts.shadow ?? "shadow-none",
  });
}

function text(slide, value, position, opts = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: noLine(),
  });
  box.text = value;
  box.text.style = {
    fontSize: opts.size ?? 16,
    bold: opts.bold ?? false,
    color: opts.color ?? "#15192F",
    typeface: "PingFang SC",
    alignment: opts.align,
    wrap: "square",
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return box;
}

async function image(slide, file, position, alt, opts = {}) {
  const bytes = await fs.readFile(file);
  const blob = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return slide.images.add({
    blob,
    contentType: "image/png",
    alt,
    fit: opts.fit ?? "contain",
    position,
  });
}

function deleteSummaryBody() {
  const slide = deck.slides.items[1];
  for (const item of [...slide.shapes.items, ...slide.images.items]) {
    const center = itemCenter(item);
    if (center && center.y >= 128 && center.y <= 652) {
      item.delete();
    }
  }
}

function bullet(slide, value, top, left, width) {
  shape(slide, "ellipse", { left, top: top + 9, width: 7, height: 7 }, { fill: "#635BFF" });
  text(slide, value, { left: left + 18, top, width, height: 36 }, {
    size: 15.5,
    color: "#2F3650",
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
  });
}

async function refineSummarySlide() {
  const slide = deck.slides.items[1];
  deleteSummaryBody();

  text(slide, "复盘：当前验证了模型链路的可行性，下一步要进入业务闭环", {
    left: 84,
    top: 136,
    width: 980,
    height: 32,
  }, {
    size: 24,
    bold: true,
    color: "#161A33",
  });
  shape(slide, "rect", { left: 84, top: 174, width: 88, height: 4 }, { fill: "#635BFF" });

  const cards = [
    {
      left: 84,
      title: "项目复盘",
      color: "#E23B3B",
      bullets: [
        "模型生产链路较长，资源消耗较大，迭代效率仍需提升",
        "部分优化仍偏技术侧，需要更深结合业务链路设计",
        "更多下游任务协同、OPD/RL 收益仍需继续验证",
      ],
    },
    {
      left: 674,
      title: "后续方向",
      color: "#08A34A",
      bullets: [
        "继续探索 Tokenizer 码本、模型规模和训练配比",
        "搜索场景蒸馏现有 Agent 链路，接入线上评估",
        "验证 OPD/RL 对通用能力恢复和推荐效果的收益",
      ],
    },
  ];

  for (const card of cards) {
    shape(slide, "rect", { left: card.left, top: 198, width: 522, height: 150 }, {
      fill: "#F8FBFF",
      line: { style: "solid", fill: "#C7E9FF", width: 1.1 },
      shadow: "shadow-sm",
    });
    text(slide, card.title, { left: card.left + 24, top: 218, width: 220, height: 26 }, {
      size: 20,
      bold: true,
      color: card.color,
    });
    card.bullets.forEach((item, index) => {
      bullet(slide, item, 258 + index * 30, card.left + 28, 448);
    });
  }

  text(slide, "下一阶段目标：从“模型能力验证”走向“业务场景闭环验证”。", {
    left: 188,
    top: 362,
    width: 904,
    height: 28,
  }, {
    size: 20,
    bold: true,
    color: "#14113D",
    align: "center",
  });

  const pipelineImage = path.join(ROOT, "assets", "md_images", "img30_u556c9990.png");
  await image(slide, pipelineImage, { left: 70, top: 404, width: 1080, height: 302 }, "教育 OneRec 基座模型训练 pipeline");
}

async function addAppendixSlide({ marker, title, imageFile, imagePosition, imageAlt }) {
  const slide = deck.slides.add();
  shape(slide, "rect", { left: 0, top: 0, width: 1280, height: 720 }, { fill: "#FFFFFF" });
  shape(slide, "ellipse", { left: 50, top: 32, width: 64, height: 64 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#635BFF", width: 2 },
  });
  text(slide, marker, { left: 50, top: 43, width: 64, height: 34 }, {
    size: 28,
    bold: true,
    color: "#635BFF",
    align: "center",
  });
  shape(slide, "rect", { left: 104, top: 42, width: 690, height: 44 }, { fill: "#635BFF" });
  text(slide, title, { left: 132, top: 49, width: 634, height: 28 }, {
    size: 24,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  shape(slide, "rect", { left: 52, top: 112, width: 1160, height: 3 }, { fill: "#635BFF" });
  await image(slide, path.join(ROOT, "assets", "qwen", "qwen-logo.png"), {
    left: 1042,
    top: 32,
    width: 34,
    height: 34,
  }, "Qwen logo");
  text(slide, "Qwen", { left: 1086, top: 35, width: 72, height: 20 }, {
    size: 15,
    bold: true,
    color: "#15192F",
  });
  text(slide, "千问", { left: 1086, top: 56, width: 72, height: 16 }, {
    size: 11,
    color: "#667085",
  });
  await image(slide, imageFile, imagePosition, imageAlt);
  return slide;
}

async function addReadableAppendixSlides() {
  const md = (...parts) => path.join(ROOT, "assets", "md_images", ...parts);
  await addAppendixSlide({
    marker: "A1",
    title: "附录 | Tokenizer 输入样例",
    imageFile: md("img31_u274a1e51.png"),
    imagePosition: { left: 60, top: 150, width: 1160, height: 390 },
    imageAlt: "Tokenizer 输入样例表",
  });
  await addAppendixSlide({
    marker: "A2",
    title: "附录 | CPT 输入样例",
    imageFile: md("img32_u9fe477fe.png"),
    imagePosition: { left: 122, top: 126, width: 1036, height: 582 },
    imageAlt: "CPT 输入样例表",
  });
  await addAppendixSlide({
    marker: "A3",
    title: "附录 | SFT 输入样例",
    imageFile: md("img34_u365ab4d6.png"),
    imagePosition: { left: 64, top: 128, width: 1152, height: 578 },
    imageAlt: "SFT 输入样例表",
  });
  await addAppendixSlide({
    marker: "A4",
    title: "附录 | I2I 结构化合规性",
    imageFile: md("img36_u51a9ff4d.png"),
    imagePosition: { left: 68, top: 134, width: 1144, height: 515 },
    imageAlt: "I2I 结构化合规性定义表",
  });
  await addAppendixSlide({
    marker: "A5",
    title: "附录 | LLM-Judge 维度",
    imageFile: md("img37_u0b327924.png"),
    imagePosition: { left: 324, top: 128, width: 632, height: 548 },
    imageAlt: "LLM-Judge 维度定义表",
  });
}

function moveAppendixAfterThanks() {
  const proto = deck.toProto();
  const [divider, summary, , , thanks, ...readableAppendix] = proto.slides;
  proto.slides = [divider, summary, thanks, ...readableAppendix];
  proto.slides.forEach((slide, index) => {
    slide.index = index;
  });
  return Presentation.load(proto);
}

replaceExactText(1, "效果与复盘", "思考与总结");
replaceExactText(1, "指标收益 | 问题沉淀 | 后续方向", "问题沉淀 | 经验反思 | 后续方向");
replaceExactText(2, "效果与复盘 | 问题、反思和后续方向", "思考与总结");
await refineSummarySlide();
deleteObjectsInBox(3, { left: 80, top: 320, width: 340, height: 155 });
deleteObjectsInBox(3, { left: 1000, top: 320, width: 205, height: 155 });
await addReadableAppendixSlides();
const orderedDeck = moveAppendixAfterThanks();

await saveSectionDeck("05", orderedDeck);
