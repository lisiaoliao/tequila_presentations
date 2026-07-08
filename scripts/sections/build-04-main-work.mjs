import fs from "node:fs/promises";
import path from "node:path";
import { buildSectionDeck, ROOT, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("04");

// Section-specific edits for 04 主要工作 go here.
// This section owns: divider 04, pipeline, Tokenizer, training, downstream tasks, constrained decoding.

function replaceSidCode(slideNo, current, replacement) {
  const slide = deck.slides.items[slideNo - 1];
  const target = slide.shapes.items.find((shape) => String(shape.text ?? "") === current);
  if (!target) {
    throw new Error(`Could not find SID code textbox on slide ${slideNo}: ${current}`);
  }
  target.text = replacement;
  target.position = { left: 92, top: 136, width: 1030, height: 28 };
  target.text.style = {
    ...target.text.style,
    fontSize: 18,
    wrap: "square",
  };
}

replaceSidCode(
  4,
  "SID code：<a_905><b_4><c_786>",
  "完整 SID：<|item_begin|>优质题目,初中,化学,<a_905><b_4><c_786><|item_end|>",
);
replaceSidCode(
  5,
  "SID code：<a_1816><b_492><c_976>",
  "完整 SID：<|item_begin|>优质题目,初中,数学,<a_1816><b_492><c_976><|item_end|>",
);
replaceSidCode(
  6,
  "SID code：<a_21><b_1572><c_1578>",
  "完整 SID：<|item_begin|>优质题目,初中,地理,<a_21><b_1572><c_1578><|item_end|>",
);

const C = {
  qwen: "#635BFF",
  green: "#08A34A",
  ink: "#15192F",
  body: "#465168",
  line: "#BFE7FF",
  panel: "#F7FBFF",
  pale: "#EEF6FF",
  gray: "#E5E7EB",
  grayText: "#697386",
  red: "#FF3B30",
  orange: "#F97316",
};

const imageCache = new Map();

async function blobFor(imagePath) {
  if (!imageCache.has(imagePath)) {
    const bytes = await fs.readFile(imagePath);
    imageCache.set(imagePath, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  return imageCache.get(imagePath);
}

async function addImage(slide, imagePath, position, alt, opts = {}) {
  const imageOpts = {
    blob: await blobFor(imagePath),
    contentType: "image/png",
    alt,
    geometry: opts.geometry,
    borderRadius: opts.borderRadius,
    position,
  };
  if (opts.fit !== false) imageOpts.fit = opts.fit ?? "contain";
  if (opts.crop) imageOpts.crop = opts.crop;
  if (opts.lockAspectRatio !== undefined) imageOpts.lockAspectRatio = opts.lockAspectRatio;
  return slide.images.add(imageOpts);
}

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function shape(slide, geometry, position, opts = {}) {
  return slide.shapes.add({
    geometry,
    position,
    fill: opts.fill ?? "none",
    line: opts.line ?? noLine(),
    shadow: opts.shadow ?? "shadow-none",
    borderRadius: opts.borderRadius,
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
    color: opts.color ?? C.ink,
    typeface: opts.typeface ?? "PingFang SC",
    alignment: opts.align,
    wrap: "square",
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return box;
}

function itemCenter(item) {
  const p = item.position ?? item.frame;
  if (!p) return null;
  return {
    x: Number(p.left) + Number(p.width) / 2,
    y: Number(p.top) + Number(p.height) / 2,
  };
}

function deleteObjectsInBox(slide, box) {
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

function replaceFirstText(slide, from, to) {
  const target = slide.shapes.items.find((shape) => String(shape.text ?? "") === from);
  if (target) target.text = to;
}

function updateTextBox(slide, value, position, style = {}) {
  const target = slide.shapes.items.find((shape) => String(shape.text ?? "") === value);
  if (!target) return;
  if (position) target.position = { ...target.position, ...position };
  target.text.style = {
    ...target.text.style,
    ...style,
  };
}

function calloutBox(slide, { title, body, left, top, width, height, fill = "#FFFFFF", stroke = "#CFE6FA", titleColor = C.ink }) {
  shape(slide, "roundRect", { left, top, width, height }, {
    fill,
    line: { style: "solid", fill: stroke, width: 1.2 },
    shadow: "shadow-sm",
  });
  text(slide, title, { left: left + 18, top: top + 16, width: width - 36, height: 24 }, {
    size: 18,
    bold: true,
    color: titleColor,
  });
  text(slide, body, { left: left + 18, top: top + 48, width: width - 36, height: height - 58 }, {
    size: 12,
    color: C.body,
  });
}

function processNode(slide, label, detail, { left, top, width, active = false, danger = false }) {
  shape(slide, "roundRect", { left, top, width, height: 58 }, {
    fill: danger ? "#FFF7ED" : active ? "#EEF6FF" : "#FFFFFF",
    line: { style: "solid", fill: danger ? "#FDBA74" : "#CFE6FA", width: 1.1 },
  });
  text(slide, label, { left: left + 14, top: top + 10, width: width - 28, height: 18 }, {
    size: 14,
    bold: true,
    color: danger ? C.orange : active ? "#1677FF" : C.ink,
    align: "center",
  });
  text(slide, detail, { left: left + 12, top: top + 32, width: width - 24, height: 16 }, {
    size: 10,
    color: C.body,
    align: "center",
  });
}

async function addQwenChrome(slide, subtitle, pageNo) {
  slide.background.fill = "#FFFFFF";
  shape(slide, "ellipse", { left: 50, top: 32, width: 64, height: 64 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: C.qwen, width: 2 },
  });
  text(slide, "4", { left: 50, top: 43, width: 64, height: 34 }, {
    size: 28,
    bold: true,
    color: C.qwen,
    align: "center",
  });
  shape(slide, "rect", { left: 104, top: 42, width: 690, height: 44 }, {
    fill: C.qwen,
    line: noLine(),
  });
  text(slide, `主要工作 | ${subtitle}`, { left: 132, top: 49, width: 634, height: 28 }, {
    size: 23,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  shape(slide, "rect", { left: 52, top: 112, width: 1160, height: 3 }, {
    fill: C.qwen,
    line: noLine(),
  });
  await addImage(
    slide,
    path.join(ROOT, "assets", "qwen", "qwen-logo.png"),
    { left: 1042, top: 32, width: 34, height: 34 },
    "Qwen logo",
  );
  text(slide, "Qwen", { left: 1086, top: 35, width: 72, height: 20 }, {
    size: 16,
    bold: true,
    color: C.ink,
  });
  text(slide, "千问", { left: 1086, top: 56, width: 72, height: 16 }, {
    size: 11,
    color: "#687084",
  });
  text(slide, pageNo, { left: 1168, top: 684, width: 42, height: 16 }, {
    size: 11,
    color: "#9AA4B8",
    align: "right",
  });
}

function addTimeBar(slide, { label, reduction, optimized, top, left }) {
  text(slide, label, { left, top, width: 82, height: 28 }, {
    size: 20,
    bold: true,
    color: C.ink,
  });
  text(slide, reduction, { left: left + 90, top: top - 3, width: 118, height: 32 }, {
    size: 26,
    bold: true,
    color: C.green,
  });
  text(slide, "耗时下降", { left: left + 210, top: top + 4, width: 80, height: 20 }, {
    size: 14,
    color: C.grayText,
  });

  const barLeft = left + 318;
  const barTop = top + 4;
  const barWidth = 392;
  shape(slide, "rect", { left: barLeft, top: barTop, width: barWidth, height: 10 }, {
    fill: C.gray,
    line: noLine(),
  });
  shape(slide, "rect", { left: barLeft, top: barTop + 18, width: barWidth, height: 10 }, {
    fill: "#DAD7FF",
    line: noLine(),
  });
  shape(slide, "rect", { left: barLeft, top: barTop + 18, width: barWidth * optimized, height: 10 }, {
    fill: C.qwen,
    line: noLine(),
  });
  text(slide, "原始 100%", { left: barLeft + barWidth + 18, top: barTop - 5, width: 100, height: 18 }, {
    size: 13,
    color: C.grayText,
  });
  text(slide, `优化后 ${(optimized * 100).toFixed(1)}%`, { left: barLeft + barWidth + 18, top: barTop + 13, width: 112, height: 18 }, {
    size: 13,
    bold: true,
    color: C.qwen,
  });
}

function addFlowStep(slide, { title, subtitle, left, top, width, active = false, dark = false }) {
  shape(slide, "roundRect", { left, top, width, height: 78 }, {
    fill: dark ? "#101E4A" : active ? "#EAF4FF" : "#FFFFFF",
    line: { style: "solid", fill: active ? "#A8D7FF" : "#D8E6F6", width: 1.2 },
    shadow: "shadow-sm",
  });
  text(slide, title, { left: left + 14, top: top + 15, width: width - 28, height: 24 }, {
    size: active ? 19 : 18,
    bold: true,
    color: dark ? "#FFFFFF" : active ? "#1677FF" : C.ink,
    align: "center",
  });
  text(slide, subtitle, { left: left + 14, top: top + 46, width: width - 28, height: 18 }, {
    size: 12,
    color: dark ? "#DCE8FF" : C.body,
    align: "center",
  });
}

function addTypePill(slide, label, position, active = false) {
  shape(slide, "roundRect", position, {
    fill: active ? "#1677FF" : "#EAF4FF",
    line: { style: "solid", fill: "#BDE0FF", width: 1.2 },
  });
  text(slide, label, {
    left: position.left,
    top: position.top + 9,
    width: position.width,
    height: 22,
  }, {
    size: 17,
    bold: true,
    color: active ? "#FFFFFF" : "#1677FF",
    align: "center",
  });
}

async function replacePipelineImage() {
  const slide = deck.slides.items[1];
  const image = slide.images.items.find((item) => {
    const p = item.position ?? {};
    return (p.left ?? 0) > 80 && (p.top ?? 0) > 140 && (p.width ?? 0) > 1000;
  });
  if (!image) {
    throw new Error("Could not find main pipeline image on slide 2.");
  }
  image.position = { left: -2000, top: -2000, width: 1, height: 1 };
  await addImage(
    slide,
    path.join(ROOT, "assets", "md_images", "onerec_pipeline_replacement.png"),
    { left: 92, top: 158.28, width: 1096, height: 403.44 },
    "教育 OneRec 基座模型训练 pipeline",
    { fit: false, lockAspectRatio: false },
  );
}

async function refineTokenizerIntroSlide() {
  const slide = deck.slides.items[2];
  deleteObjectsInBox(slide, { left: 70, top: 132, width: 1140, height: 520 });

  text(slide, "把异构教育 Item 转成可被 LLM 学习和生成的离散 SID token。", {
    left: 86,
    top: 146,
    width: 840,
    height: 28,
  }, {
    size: 22,
    bold: true,
    color: C.ink,
  });

  const flowTop = 188;
  const stepW = 164;
  const gap = 48;
  const startX = 76;
  const steps = [
    ["Item 语义文本", "题干 / 元数据 / 摘要"],
    ["Embedding", "语义向量表示"],
    ["RQ-VAE", "多级残差量化"],
    ["SID Codebook", "<a><b><c> 离散码"],
    ["LLM Special Token", "边界符 + SID token"],
  ];
  steps.forEach(([title, subtitle], index) => {
    addFlowStep(slide, {
      title,
      subtitle,
      left: startX + index * (stepW + gap),
      top: flowTop,
      width: index === 4 ? 198 : stepW,
      active: index === 2 || index === 3,
      dark: index === 4,
    });
    if (index < steps.length - 1) {
      text(slide, "→", {
        left: startX + stepW + index * (stepW + gap) + 6,
        top: flowTop + 22,
        width: 40,
        height: 28,
      }, {
        size: 30,
        bold: true,
        color: "#1677FF",
        align: "center",
      });
    }
  });

  await addImage(
    slide,
    path.join(ROOT, "assets", "md_images", "img25_u6f2d4263.png"),
    { left: 86, top: 306, width: 638, height: 320 },
    "RQ-VAE tokenizer architecture",
    { fit: false, lockAspectRatio: false },
  );

  shape(slide, "roundRect", { left: 760, top: 300, width: 420, height: 178 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1.2 },
    shadow: "shadow-sm",
  });
  text(slide, "SID 结构", { left: 792, top: 326, width: 160, height: 30 }, {
    size: 23,
    bold: true,
    color: C.ink,
  });
  shape(slide, "roundRect", { left: 792, top: 372, width: 348, height: 58 }, {
    fill: "#F3F9FF",
    line: { style: "solid", fill: "#D7E8F7", width: 1 },
  });
  text(slide, "<|item_begin|> 类型, 学段, 学科,", { left: 812, top: 382, width: 302, height: 18 }, {
    size: 14,
    bold: true,
    color: "#1677FF",
  });
  text(slide, "<a_x><b_y><c_z> <|item_end|>", { left: 866, top: 404, width: 250, height: 18 }, {
    size: 14,
    bold: true,
    color: "#1677FF",
  });
  text(slide, "边界符限定生成范围；文本标签提供类型约束；SID 承载离散语义索引。", {
    left: 792,
    top: 448,
    width: 340,
    height: 20,
  }, {
    size: 12,
    color: C.body,
  });

  shape(slide, "roundRect", { left: 760, top: 500, width: 420, height: 130 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1.2 },
    shadow: "shadow-sm",
  });
  text(slide, "异构类型支持", { left: 792, top: 522, width: 210, height: 28 }, {
    size: 22,
    bold: true,
    color: C.ink,
  });
  addTypePill(slide, "题目", { left: 792, top: 562, width: 74, height: 34 }, true);
  addTypePill(slide, "试卷", { left: 884, top: 562, width: 74, height: 34 });
  addTypePill(slide, "视频", { left: 976, top: 562, width: 74, height: 34 });
  addTypePill(slide, "小讲堂", { left: 1068, top: 562, width: 86, height: 34 });
  text(slide, "同一词表空间支持题目、试卷、视频、小讲堂；训练时对高频题目降采样，对长尾类型过采样，避免单一题目类型主导。", {
    left: 792,
    top: 608,
    width: 340,
    height: 18,
  }, {
    size: 11,
    color: C.body,
  });

}

function addCell(slide, value, position, opts = {}) {
  shape(slide, "rect", position, {
    fill: opts.fill ?? "#FFFFFF",
    line: { style: "solid", fill: opts.line ?? "#DFE7F2", width: opts.lineWidth ?? 1 },
  });
  text(slide, value, {
    left: position.left + (opts.padX ?? 10),
    top: position.top + (opts.padY ?? 10),
    width: position.width - 2 * (opts.padX ?? 10),
    height: position.height - 2 * (opts.padY ?? 10),
  }, {
    size: opts.size ?? 17,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    align: opts.align ?? "center",
  });
}

function addCenteredText(slide, value, position, opts = {}) {
  text(slide, value, position, {
    size: opts.size ?? 18,
    bold: opts.bold ?? false,
    color: opts.color ?? C.body,
    align: "center",
  });
}

function addPrefixPercentCell(slide, segments, position) {
  const widths = [70, 16, 70, 16, 54];
  const totalW = widths.reduce((sum, width) => sum + width, 0);
  let x = position.left + (position.width - totalW) / 2;
  segments.forEach((segment, index) => {
    text(slide, segment.text, {
      left: x,
      top: position.top,
      width: widths[index],
      height: position.height,
    }, {
      size: 17,
      bold: segment.emphasis ?? false,
      color: segment.color ?? C.body,
      align: "center",
    });
    x += widths[index];
  });
}

function refineItemUnderstandingSlide() {
  const slide = deck.slides.items[8];
  deleteObjectsInBox(slide, { left: 150, top: 390, width: 950, height: 150 });

  const left = 126;
  const top = 392;
  const widths = [210, 190, 318, 150, 150];
  const headerH = 44;
  const rowH = 56;
  const tableW = widths.reduce((sum, width) => sum + width, 0);
  const tableH = headerH + rowH * 2;
  const border = "#D6E4F5";
  const header = C.qwen;

  shape(slide, "roundRect", { left, top, width: tableW, height: tableH }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: border, width: 1.3 },
    shadow: "shadow-sm",
  });
  shape(slide, "roundRect", { left, top, width: tableW, height: headerH }, {
    fill: header,
    line: noLine(),
  });
  shape(slide, "rect", { left: left + 1, top: top + headerH + rowH, width: tableW - 2, height: rowH - 1 }, {
    fill: "#F7FAFF",
    line: noLine(),
  });

  const xCuts = widths.slice(0, -1).reduce((cuts, width) => {
    cuts.push((cuts.at(-1) ?? left) + width);
    return cuts;
  }, []);
  xCuts.forEach((x) => {
    shape(slide, "rect", { left: x, top, width: 1.1, height: tableH }, {
      fill: border,
      line: noLine(),
    });
  });
  [top + headerH, top + headerH + rowH].forEach((y) => {
    shape(slide, "rect", { left, top: y, width: tableW, height: 1.1 }, {
      fill: border,
      line: noLine(),
    });
  });

  const headers = ["模型", "类型/学段/学科", "SID 前缀准确性", "SID 有效", "回退有效"];
  let x = left;
  headers.forEach((label, index) => {
    addCenteredText(slide, label, {
      left: x,
      top: top + 12,
      width: widths[index],
      height: 22,
    }, {
      size: 17,
      bold: true,
      color: "#FFFFFF",
    });
    x += widths[index];
  });

  const rows = [
    {
      model: "baseline hot",
      type: "93.0%",
      prefix: ["65.2%", "/", "20.7%", "/", "3.9%"],
      valid: "17.0%",
      fallback: "94.3%",
    },
    {
      model: "baseline tail",
      type: "98.3%",
      prefix: ["66.7%", "/", "22.8%", "/", "1.8%"],
      valid: "12.1%",
      fallback: "84.5%",
    },
  ];
  rows.forEach((row, rowIndex) => {
    const y = top + headerH + rowH * rowIndex;
    const rowTop = y + 17;
    const positions = [];
    let cellLeft = left;
    widths.forEach((width) => {
      positions.push({ left: cellLeft, width });
      cellLeft += width;
    });

    addCenteredText(slide, row.model, { left: positions[0].left, top: rowTop, width: positions[0].width, height: 24 }, {
      size: 17,
      color: C.body,
    });
    addCenteredText(slide, row.type, { left: positions[1].left, top: rowTop, width: positions[1].width, height: 24 }, {
      size: 18,
      color: C.body,
    });
    addPrefixPercentCell(slide, [
      { text: row.prefix[0] },
      { text: row.prefix[1], color: "#8893A7" },
      { text: row.prefix[2] },
      { text: row.prefix[3], color: "#8893A7" },
      { text: row.prefix[4], color: "#FF3B30", emphasis: true },
    ], { left: positions[2].left, top: rowTop, width: positions[2].width, height: 24 });
    addCenteredText(slide, row.valid, { left: positions[3].left, top: rowTop, width: positions[3].width, height: 24 }, {
      size: 18,
      bold: true,
      color: "#FF3B30",
    });
    addCenteredText(slide, row.fallback, { left: positions[4].left, top: rowTop, width: positions[4].width, height: 24 }, {
      size: 18,
      color: C.body,
    });
  });
  shape(slide, "roundRect", { left, top, width: tableW, height: tableH }, {
    fill: "none",
    line: { style: "solid", fill: border, width: 1.3 },
  });
}

function refineGeneralCapabilitySlide() {
  const slide = deck.slides.items[7];
  deleteObjectsInBox(slide, { left: 60, top: 185, width: 1160, height: 455 });

  const left = 76;
  const top = 212;
  const tableW = 1128;
  const modelW = 234;
  const metricW = (tableW - modelW) / 6;
  const groupH = 48;
  const headerH = 52;
  const rowH = 70;
  const purple = C.qwen;
  const lightPurple = "#F0EEFF";
  const stripe = "#F8FBFF";
  const grid = "#D9E3F2";
  const tableH = groupH + headerH + rowH * 3;

  shape(slide, "roundRect", { left, top, width: tableW, height: tableH }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: grid, width: 1.2 },
    shadow: "shadow-sm",
  });
  shape(slide, "roundRect", { left, top, width: tableW, height: groupH }, {
    fill: purple,
    line: noLine(),
  });
  shape(slide, "rect", { left: left + modelW, top: top + groupH, width: tableW - modelW, height: headerH }, {
    fill: "#F4F7FF",
    line: noLine(),
  });
  shape(slide, "roundRect", { left, top, width: modelW, height: groupH + headerH }, {
    fill: purple,
    line: noLine(),
  });
  shape(slide, "roundRect", { left, top: top + groupH + headerH + rowH, width: tableW, height: rowH }, {
    fill: stripe,
    line: noLine(),
  });
  shape(slide, "roundRect", { left, top: top + groupH + headerH + rowH * 2, width: tableW, height: rowH }, {
    fill: lightPurple,
    line: noLine(),
  });

  text(slide, "模型", { left: left + 18, top: top + 36, width: modelW - 36, height: 30 }, {
    size: 20,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "数学与文本推理", { left: left + modelW, top: top + 13, width: metricW * 3, height: 22 }, {
    size: 18,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "通用任务", { left: left + modelW + metricW * 3, top: top + 13, width: metricW * 2, height: 22 }, {
    size: 18,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "指令对齐", { left: left + modelW + metricW * 5, top: top + 13, width: metricW, height: 22 }, {
    size: 18,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });

  const metrics = ["GSM8K", "MATH-500", "AIME'24", "MMLU-Pro", "GPQA-D", "IFEVAL"];
  metrics.forEach((metric, index) => {
    text(slide, metric, { left: left + modelW + metricW * index, top: top + groupH + 15, width: metricW, height: 24 }, {
      size: 17,
      bold: true,
      color: C.ink,
      align: "center",
    });
  });

  const rows = [
    ["Qwen3-8B", "93.03%", "80.80%", "24.37%", "63.80%", "43.94%", "80.78%"],
    ["OpenOneRec SFT", "90.60%", "87.60%", "6.88%", "49.09%", "33.84%", "56.38%"],
    ["Ours", "84.31%", "53.80%", "3.75%", "33.46%", "20.71%", "53.23%"],
  ];
  rows.forEach((row, rowIndex) => {
    const y = top + groupH + headerH + rowH * rowIndex;
    text(slide, row[0], { left: left + 20, top: y + 22, width: modelW - 40, height: 28 }, {
      size: 18,
      bold: rowIndex === 2,
      color: rowIndex === 2 ? purple : C.body,
      align: "left",
    });
    row.slice(1).forEach((value, index) => {
      text(slide, value, { left: left + modelW + metricW * index, top: y + 21, width: metricW, height: 28 }, {
        size: rowIndex === 2 ? 20 : 19,
        bold: rowIndex === 2,
        color: rowIndex === 2 ? purple : C.body,
        align: "center",
      });
    });
  });

  const separators = [
    left + modelW,
    left + modelW + metricW * 3,
    left + modelW + metricW * 5,
  ];
  separators.forEach((x) => {
    shape(slide, "rect", { left: x, top, width: 1.4, height: tableH }, {
      fill: grid,
      line: noLine(),
    });
  });
  [top + groupH + headerH, top + groupH + headerH + rowH, top + groupH + headerH + rowH * 2].forEach((y) => {
    shape(slide, "rect", { left, top: y, width: tableW, height: 1.2 }, {
      fill: grid,
      line: noLine(),
    });
  });

  shape(slide, "roundRect", { left: 152, top: 572, width: 976, height: 54 }, {
    fill: "#F7F8FF",
    line: { style: "solid", fill: "#D9D5FF", width: 1 },
    radius: 8,
  });
  text(slide, "结论：当前重点是先跑通教育推荐链路；通用能力恢复需要更大通用数据配比、OPD/RL 继续验证。", {
    left: 178,
    top: 590,
    width: 924,
    height: 24,
  }, {
    size: 17,
    bold: true,
    color: C.ink,
    align: "center",
  });
}

function refineI2IRecommendationSlide() {
  const slide = deck.slides.items[9];
  deleteObjectsInBox(slide, { left: 70, top: 132, width: 1140, height: 520 });

  text(slide, "Layer 1-3：基础推荐 -> 指令遵循 -> 推荐理由", {
    left: 84,
    top: 148,
    width: 760,
    height: 28,
  }, {
    size: 21,
    bold: true,
    color: C.ink,
  });
  text(slide, "围绕“锚点 Item + 结构化约束”生成 CoT、推荐 SID 与逐项理由，并通过反查库映射回真实物品。", {
    left: 84,
    top: 180,
    width: 980,
    height: 20,
  }, {
    size: 13,
    color: C.body,
  });

  shape(slide, "roundRect", { left: 84, top: 214, width: 414, height: 164 }, {
    fill: "#F8FBFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1.2 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "任务定义", { left: 108, top: 236, width: 180, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  const taskPoints = [
    ["锚点理解", "提取知识点、解题模型、题型与设问情境"],
    ["约束遵循", "按 types / count 控制推荐类型与数量"],
    ["推荐解释", "生成粗粒度 CoT 与逐项推荐理由"],
  ];
  taskPoints.forEach(([title, desc], index) => {
    const top = 276 + index * 30;
    shape(slide, "ellipse", { left: 110, top: top + 2, width: 16, height: 16 }, {
      fill: index === 0 ? C.qwen : index === 1 ? C.green : C.orange,
      line: noLine(),
    });
    text(slide, String(index + 1), { left: 110, top: top + 4, width: 16, height: 10 }, {
      size: 8,
      bold: true,
      color: "#FFFFFF",
      align: "center",
    });
    text(slide, title, { left: 138, top: top - 1, width: 78, height: 16 }, {
      size: 13,
      bold: true,
      color: C.ink,
    });
    text(slide, desc, { left: 222, top: top - 1, width: 230, height: 16 }, {
      size: 10,
      color: C.body,
    });
  });
  shape(slide, "roundRect", { left: 530, top: 214, width: 666, height: 164 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1.2 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "Item 反查链路", { left: 554, top: 236, width: 180, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  const lookupSteps = [
    ["1", "精确命中", "按完整 SID 查找真实物品"],
    ["2", "前缀回退", "逐级放宽，命中即停"],
    ["3", "未命中剔除", "仍无法反查时去除该推荐"],
  ];
  lookupSteps.forEach(([idx, title, desc], index) => {
    const left = 558 + index * 196;
    shape(slide, "roundRect", { left, top: 284, width: 166, height: 62 }, {
      fill: index === 0 ? "#F0FFF6" : index === 1 ? "#F4F1FF" : "#FFF7ED",
      line: { style: "solid", fill: index === 0 ? "#A7F3D0" : index === 1 ? "#CDC8FF" : "#FDBA74", width: 1 },
      borderRadius: "rounded-md",
    });
    shape(slide, "ellipse", { left: left + 12, top: 302, width: 26, height: 26 }, {
      fill: index === 2 ? C.orange : index === 1 ? C.qwen : C.green,
      line: noLine(),
    });
    text(slide, idx, { left: left + 12, top: 307, width: 26, height: 14 }, {
      size: 11,
      bold: true,
      color: "#FFFFFF",
      align: "center",
    });
    text(slide, title, { left: left + 46, top: 296, width: 96, height: 18 }, {
      size: 13,
      bold: true,
      color: C.ink,
    });
    text(slide, desc, { left: left + 46, top: 318, width: 104, height: 20 }, {
      size: 9,
      color: C.body,
    });
    if (index < lookupSteps.length - 1) {
      text(slide, "→", { left: left + 172, top: 300, width: 24, height: 22 }, {
        size: 22,
        bold: true,
        color: C.grayText,
        align: "center",
      });
    }
  });
  text(slide, "默认最多回退到前两层 (a,b)，保证“能落库”与“尽量保留语义精度”之间平衡。", {
    left: 554,
    top: 354,
    width: 570,
    height: 16,
  }, {
    size: 11,
    color: C.grayText,
  });

  shape(slide, "roundRect", { left: 84, top: 408, width: 1112, height: 176 }, {
    fill: "#F8FBFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1.2 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "训练数据构造：多源相似 pair 挖掘 + 教师过滤/蒸馏", {
    left: 108,
    top: 426,
    width: 520,
    height: 24,
  }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  const sourceCards = [
    ["书籍共现", "易错题书籍", "同知识点/同错因", "高", "#F0FFF6", C.green],
    ["试卷共现", "试卷数据", "ItemCF/Swing 挖掘", "中", "#F4F1FF", C.qwen],
    ["用户行为", "拍搜日志", "用户交互共现", "弱", "#FFFFFF", C.grayText],
    ["语义相似", "Item 库", "embedding 近邻召回", "弱", "#FFFFFF", C.grayText],
  ];
  sourceCards.forEach(([title, source, logic, causal, fill, accent], index) => {
    const left = 108 + index * 172;
    const cardTop = 480;
    shape(slide, "roundRect", { left, top: cardTop, width: 150, height: 84 }, {
      fill,
      line: { style: "solid", fill: "#D7E8F7", width: 1 },
      borderRadius: "rounded-md",
    });
    text(slide, title, { left: left + 10, top: cardTop + 12, width: 130, height: 18 }, {
      size: 14,
      bold: true,
      color: accent,
      align: "center",
    });
    text(slide, source, { left: left + 10, top: cardTop + 36, width: 130, height: 14 }, {
      size: 10,
      color: C.body,
      align: "center",
    });
    text(slide, logic, { left: left + 10, top: cardTop + 54, width: 130, height: 14 }, {
      size: 10,
      color: C.body,
      align: "center",
    });
    text(slide, `因果性：${causal}`, { left: left + 10, top: cardTop + 70, width: 130, height: 12 }, {
      size: 9,
      color: C.grayText,
      align: "center",
    });
  });

  const filters = [
    ["优质题库替换", "非优质库推荐 item 召回到优质题库相似题"],
    ["LLM 预过滤", "判断 pair 因果性，并蒸馏 CoT"],
    ["后过滤对齐评估", "保留满足结构、反查和质量标准的数据"],
  ];
  filters.forEach(([title, desc], index) => {
    const left = 820;
    const top = 470 + index * 38;
    shape(slide, "roundRect", { left, top, width: 308, height: 30 }, {
      fill: index === 1 ? "#F4F1FF" : "#FFFFFF",
      line: { style: "solid", fill: "#D7E8F7", width: 1 },
      borderRadius: "rounded-md",
    });
    text(slide, title, { left: left + 14, top: top + 7, width: 92, height: 14 }, {
      size: 11,
      bold: true,
      color: index === 1 ? C.qwen : C.ink,
    });
    text(slide, desc, { left: left + 112, top: top + 7, width: 174, height: 14 }, {
      size: 9,
      color: C.body,
    });
  });
  shape(slide, "rect", { left: 796, top: 480, width: 2, height: 76 }, {
    fill: C.qwen,
    line: noLine(),
  });
  text(slide, "↓", { left: 786, top: 548, width: 22, height: 18 }, {
    size: 18,
    bold: true,
    color: C.qwen,
    align: "center",
  });

  text(slide, "目标：在缺少规模化行为反馈的冷启动阶段，用结构化先验 + 教师蒸馏提前注入协同知识。", {
    left: 164,
    top: 604,
    width: 952,
    height: 24,
  }, {
    size: 16,
    bold: true,
    color: C.ink,
    align: "center",
  });
}

function addPillMetric(slide, label, value, position, opts = {}) {
  shape(slide, "roundRect", position, {
    fill: opts.fill ?? "#EEFDF4",
    line: { style: "solid", fill: opts.line ?? "#BDECCF", width: 1 },
    borderRadius: "rounded-lg",
  });
  text(slide, label, { left: position.left + 14, top: position.top + 13, width: position.width - 82, height: 20 }, {
    size: 14,
    bold: true,
    color: opts.labelColor ?? C.ink,
  });
  text(slide, value, { left: position.left + position.width - 76, top: position.top + 9, width: 60, height: 26 }, {
    size: 22,
    bold: true,
    color: opts.valueColor ?? C.green,
    align: "right",
  });
}

function addRiskMetric(slide, label, value, ratio, top, opts = {}) {
  const left = opts.left ?? 112;
  const barLeft = opts.barLeft ?? 278;
  const valueLeft = opts.valueLeft ?? 610;
  const barWidth = opts.barWidth ?? 300;
  const red = "#EF4444";
  text(slide, label, { left, top: top - 4, width: 144, height: 24 }, {
    size: 17,
    bold: true,
    color: C.ink,
  });
  shape(slide, "roundRect", { left: barLeft, top, width: barWidth, height: 14 }, {
    fill: "#E5E7EB",
    line: noLine(),
    borderRadius: "rounded-full",
  });
  shape(slide, "roundRect", { left: barLeft, top, width: barWidth * ratio, height: 14 }, {
    fill: opts.good ? C.green : red,
    line: noLine(),
    borderRadius: "rounded-full",
  });
  text(slide, value, { left: valueLeft, top: top - 6, width: 76, height: 24 }, {
    size: 18,
    bold: true,
    color: opts.good ? C.green : red,
    align: "right",
  });
}

function addQualityCard(slide, { title, overall, exact, prefix, delta, top }) {
  const left = 728;
  const width = 420;
  shape(slide, "roundRect", { left, top, width, height: 116 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#DDEBFA", width: 1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, title, { left: left + 20, top: top + 16, width: 150, height: 24 }, {
    size: 18,
    bold: true,
    color: C.ink,
  });
  text(slide, overall, { left: left + 314, top: top + 12, width: 72, height: 30 }, {
    size: 26,
    bold: true,
    color: C.qwen,
    align: "right",
  });
  text(slide, "综合", { left: left + 268, top: top + 19, width: 42, height: 18 }, {
    size: 13,
    color: C.grayText,
    align: "right",
  });

  const exactX = left + 22;
  const prefixX = left + 180;
  text(slide, "exact 精准命中", { left: exactX, top: top + 60, width: 130, height: 18 }, {
    size: 13,
    bold: true,
    color: C.green,
  });
  text(slide, exact, { left: exactX, top: top + 80, width: 80, height: 26 }, {
    size: 22,
    bold: true,
    color: C.green,
  });
  text(slide, "prefix 前缀回退", { left: prefixX, top: top + 60, width: 130, height: 18 }, {
    size: 13,
    bold: true,
    color: "#EF4444",
  });
  text(slide, prefix, { left: prefixX, top: top + 80, width: 80, height: 26 }, {
    size: 22,
    bold: true,
    color: "#EF4444",
  });
  text(slide, delta, { left: left + 316, top: top + 78, width: 76, height: 22 }, {
    size: 16,
    bold: true,
    color: "#EF4444",
    align: "right",
  });
}

function refineEvaluationProblemsSlide() {
  const slide = deck.slides.items[10];
  replaceFirstText(slide, "主要工作 | 评估暴露的问题", "主要工作 | I2I推荐评估");
  deleteObjectsInBox(slide, { left: 70, top: 135, width: 1130, height: 500 });

  text(slide, "结构化合规性达标，但有效 SID、去重与回退命中质量仍影响真实推荐。", {
    left: 84,
    top: 148,
    width: 980,
    height: 28,
  }, {
    size: 21,
    bold: true,
    color: C.ink,
  });

  shape(slide, "roundRect", { left: 76, top: 198, width: 570, height: 410 }, {
    fill: "#F7FBFF",
    line: { style: "solid", fill: "#D7E8F7", width: 1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "结构化合规性", { left: 104, top: 218, width: 180, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  text(slide, "格式输出稳定，问题不在可解析性和任务约束。", { left: 294, top: 222, width: 316, height: 20 }, {
    size: 14,
    color: C.body,
  });
  addPillMetric(slide, "SID 可解析", "100%", { left: 104, top: 268, width: 168, height: 46 });
  addPillMetric(slide, "类型合规", "100%", { left: 284, top: 268, width: 168, height: 46 });
  addPillMetric(slide, "数量精确", "100%", { left: 464, top: 268, width: 168, height: 46 });

  shape(slide, "rect", { left: 104, top: 346, width: 500, height: 1 }, {
    fill: "#D7E8F7",
    line: noLine(),
  });
  text(slide, "结构化风险", { left: 104, top: 374, width: 160, height: 22 }, {
    size: 18,
    bold: true,
    color: C.ink,
  });
  text(slide, "合法格式之外，SID 仍会无效或重复。", { left: 254, top: 376, width: 328, height: 18 }, {
    size: 14,
    color: C.body,
  });
  addRiskMetric(slide, "SID 去重率", "40.8%", 0.408, 426, { left: 104, barLeft: 244, barWidth: 278, valueLeft: 534 });
  addRiskMetric(slide, "SID 有效率", "46.5%", 0.465, 468, { left: 104, barLeft: 244, barWidth: 278, valueLeft: 534 });
  addRiskMetric(slide, "回退有效率", "98.3%", 0.983, 510, { left: 104, barLeft: 244, barWidth: 278, valueLeft: 534, good: true });

  shape(slide, "roundRect", { left: 684, top: 198, width: 496, height: 410 }, {
    fill: "#F8FBFF",
    line: { style: "solid", fill: "#D7E8F7", width: 1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "LLM-Judge", { left: 714, top: 218, width: 160, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  text(slide, "opus-4-8 评分，1-5分，3分合格", {
    left: 714,
    top: 248,
    width: 440,
    height: 20,
  }, {
    size: 13,
    color: C.body,
  });
  text(slide, "CoT 文本质量", { left: 714, top: 286, width: 120, height: 18 }, {
    size: 14,
    bold: true,
    color: C.ink,
  });
  [
    ["表达清晰", "4.83"],
    ["提取推理", "4.49"],
    ["step2一致", "4.18"],
  ].forEach(([label, score], index) => {
    const left = 714 + index * 144;
    shape(slide, "roundRect", { left, top: 314, width: 132, height: 42 }, {
      fill: "#EEFDF4",
      line: { style: "solid", fill: "#BDECCF", width: 1 },
      borderRadius: "rounded-lg",
    });
    text(slide, label, { left: left + 12, top: 326, width: 62, height: 16 }, {
      size: 11,
      bold: true,
      color: C.ink,
      align: "left",
    });
    text(slide, score, { left: left + 76, top: 320, width: 44, height: 24 }, {
      size: 20,
      bold: true,
      color: C.green,
      align: "right",
    });
  });
  addQualityCard(slide, {
    title: "关联效度",
    overall: "3.08",
    exact: "3.57",
    prefix: "2.58",
    delta: "-0.99",
    top: 372,
  });
  addQualityCard(slide, {
    title: "理由忠实度",
    overall: "2.87",
    exact: "3.37",
    prefix: "2.35",
    delta: "-1.02",
    top: 492,
  });

  shape(slide, "roundRect", { left: 334, top: 620, width: 612, height: 42 }, {
    fill: "#F0EEFF",
    line: { style: "solid", fill: "#CFC9FF", width: 1 },
    borderRadius: "rounded-full",
    shadow: "shadow-sm",
  });
  text(slide, "解法：限制性解码", {
    left: 354,
    top: 630,
    width: 572,
    height: 24,
  }, {
    size: 21,
    bold: true,
    color: C.qwen,
    align: "center",
  });
}

function refineSidCaseImages() {
  for (const slideNo of [4, 5, 6]) {
    const slide = deck.slides.items[slideNo - 1];
    deleteObjectsInBox(slide, { left: 120, top: 630, width: 1040, height: 70 });
    const frame = slide.shapes.items.find((item) => {
      const p = item.position ?? {};
      return (p.top ?? 0) > 150 && (p.top ?? 0) < 180 && (p.width ?? 0) > 1000;
    });
    if (frame) {
      frame.position = { left: 74, top: 166, width: 1132, height: 506 };
    }
    const image = slide.images.items.find((item) => {
      const p = item.position ?? {};
      return (p.top ?? 0) > 120 && (p.width ?? 0) > 500;
    });
    if (!image) {
      throw new Error(`Could not find SID case image on slide ${slideNo}.`);
    }
    image.position = { left: 80, top: 172, width: 1120, height: 494 };
    image.fit = "cover";
  }
}

function refineTrainingStageCards() {
  const slide = deck.slides.items[6];
  [
    {
      left: 112,
      oldStage: "Stage 1",
      stage: "CPT Stage 1",
      title: "冻结主干",
      body: "只训练新增 item token embedding，降低污染",
    },
    {
      left: 500,
      oldStage: "Stage 2",
      stage: "CPT Stage 2",
      title: "领域-通用混合",
      body: "推荐数据混合 reasoning-heavy 通用语料，低学习率全参训练",
    },
    {
      left: 888,
      oldStage: "SFT",
      stage: "SFT",
      title: "轻量指令调整",
      body: "推荐指令 + 通用指令/推理数据继续混合",
    },
  ].forEach(({ left, oldStage, stage, title, body }) => {
    const textLeft = left + 28;
    [oldStage, stage, title, body].forEach((value) => {
      const target = slide.shapes.items.find((shape) => String(shape.text ?? "") === value);
      if (target) target.delete();
    });
    text(slide, stage, { left: left + 28, top: 248, width: 300, height: 24 }, {
      size: 18,
      bold: true,
      color: C.qwen,
      align: "center",
    });
    text(slide, title, { left: left + 28, top: 282, width: 300, height: 24 }, {
      size: 20,
      bold: true,
      color: C.ink,
      align: "center",
    });
    text(slide, body, { left: textLeft, top: 318, width: 226, height: 32 }, {
      size: 12,
      color: C.body,
      align: "left",
    });
  });
}

function refineConstrainedDecodingFlowSlide() {
  const slide = deck.slides.items[11];
  replaceFirstText(slide, "主要工作 | 推理：限制性解码", "主要工作 | 限制性解码：Trie 构造");
  deleteObjectsInBox(slide, { left: 70, top: 132, width: 1140, height: 520 });

  text(slide, "从一个 SID case 出发，理解标签、分层码与 Trie 约束。", {
    left: 84,
    top: 148,
    width: 980,
    height: 28,
  }, {
    size: 22,
    bold: true,
    color: C.ink,
  });

  const panelTop = 198;
  const panelH = 388;
  const card = (left, top, width, height, title, subtitle, opts = {}) => {
    shape(slide, "roundRect", { left, top, width, height }, {
      fill: opts.fill ?? "#FFFFFF",
      line: { style: "solid", fill: opts.stroke ?? "#D7E8F7", width: 1.1 },
      shadow: opts.shadow ?? "shadow-sm",
      borderRadius: "rounded-lg",
    });
    text(slide, title, { left: left + 18, top: top + 16, width: width - 36, height: 24 }, {
      size: opts.titleSize ?? 18,
      bold: true,
      color: opts.titleColor ?? C.qwen,
    });
    if (subtitle) {
      text(slide, subtitle, { left: left + 18, top: top + 46, width: width - 36, height: 18 }, {
        size: 11,
        color: C.grayText,
      });
    }
  };

  card(76, panelTop, 430, panelH, "", "", {
    fill: "#F8FBFF",
  });
  shape(slide, "ellipse", { left: 104, top: 216, width: 42, height: 42 }, {
    fill: "#1677FF",
    line: noLine(),
  });
  text(slide, "1", { left: 104, top: 226, width: 42, height: 18 }, {
    size: 18,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "从 SID case 理解结构", { left: 158, top: 224, width: 300, height: 24 }, {
    size: 18,
    bold: true,
    color: C.qwen,
  });
  text(slide, "标签负责业务约束，分层码负责语义定位", { left: 110, top: 254, width: 360, height: 18 }, {
    size: 11,
    color: C.grayText,
  });
  text(slide, "示例 SID", { left: 110, top: 276, width: 120, height: 18 }, {
    size: 13,
    bold: true,
    color: "#1677FF",
  });
  shape(slide, "roundRect", { left: 110, top: 300, width: 360, height: 56 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1 },
    borderRadius: "rounded-md",
  });
  text(slide, "<|item_begin|>题目，高中，英语,", { left: 128, top: 312, width: 324, height: 13 }, {
    size: 10,
    bold: true,
    color: C.ink,
    align: "center",
  });
  text(slide, "<a_689><b_483><c_1914><|item_end|>", { left: 128, top: 334, width: 324, height: 13 }, {
    size: 10,
    bold: true,
    color: C.green,
    align: "center",
  });
  shape(slide, "rect", { left: 248, top: 329, width: 76, height: 2 }, { fill: "#1677FF", line: noLine() });
  shape(slide, "rect", { left: 220, top: 352, width: 180, height: 2 }, { fill: C.green, line: noLine() });

  text(slide, "标签：题目 / 高中 / 英语", { left: 116, top: 376, width: 176, height: 16 }, {
    size: 12,
    bold: true,
    color: "#1677FF",
  });
  text(slide, "分层码：689 → 483 → 1914", { left: 300, top: 376, width: 178, height: 16 }, {
    size: 12,
    bold: true,
    color: C.green,
  });
  shape(slide, "rect", { left: 110, top: 410, width: 360, height: 1 }, {
    fill: "#C7D7EA",
    line: noLine(),
  });
  shape(slide, "ellipse", { left: 118, top: 430, width: 46, height: 46 }, {
    fill: "#EAF4FF",
    line: noLine(),
  });
  shape(slide, "roundRect", { left: 130, top: 443, width: 22, height: 18 }, {
    fill: "#1677FF",
    line: noLine(),
    borderRadius: "rounded-md",
  });
  text(slide, "ID", { left: 130, top: 447, width: 22, height: 10 }, {
    size: 7,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "标签元组（题目，高中，英语） → label_id", { left: 190, top: 438, width: 260, height: 18 }, {
    size: 11,
    bold: true,
    color: C.ink,
  });

  shape(slide, "roundRect", { left: 110, top: 510, width: 360, height: 44 }, {
    fill: "#EEF6FF",
    line: { style: "solid", fill: "#BDE0FF", width: 1 },
    borderRadius: "rounded-md",
  });
  text(slide, "一个 SID = 标签 + 分层码路径", { left: 150, top: 523, width: 280, height: 18 }, {
    size: 15,
    bold: true,
    color: "#1677FF",
    align: "center",
  });

  text(slide, "→", { left: 506, top: 354, width: 34, height: 44 }, {
    size: 42,
    bold: true,
    color: C.qwen,
    align: "center",
  });

  card(540, panelTop, 300, panelH, "", "", {
    fill: "#FFFFFF",
  });
  shape(slide, "ellipse", { left: 558, top: 216, width: 34, height: 34 }, {
    fill: C.qwen,
    line: noLine(),
  });
  text(slide, "2", { left: 558, top: 224, width: 34, height: 16 }, {
    size: 13,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "用合法路径集合构造 Trie", { left: 604, top: 222, width: 210, height: 22 }, {
    size: 16,
    bold: true,
    color: C.qwen,
  });
  text(slide, "同一标签下收集真实存在的码路径", { left: 604, top: 252, width: 210, height: 16 }, {
    size: 10.5,
    color: C.grayText,
  });
  shape(slide, "roundRect", { left: 566, top: 276, width: 248, height: 58 }, {
    fill: "#F8FBFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1 },
    borderRadius: "rounded-md",
  });
  text(slide, "标签：优质题目 / 高中 / 地理", { left: 582, top: 288, width: 216, height: 16 }, {
    size: 12,
    bold: true,
    color: C.ink,
    align: "center",
  });
  text(slide, "原始集合中假设有 3 条记录", { left: 582, top: 310, width: 216, height: 14 }, {
    size: 10,
    color: C.grayText,
    align: "center",
  });
  shape(slide, "roundRect", { left: 566, top: 360, width: 248, height: 32 }, {
    fill: "#0F9F8F",
    line: noLine(),
    borderRadius: "rounded-md",
  });
  text(slide, "路径编号", { left: 582, top: 369, width: 74, height: 14 }, {
    size: 11,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "(a, b, c) 三元组", { left: 670, top: 369, width: 120, height: 14 }, {
    size: 11,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  const pathRows = [
    ["1", "(0, 1, 2)"],
    ["2", "(0, 1, 3)"],
    ["3", "(0, 2, 0)"],
  ];
  pathRows.forEach(([idx, tuple], index) => {
    const top = 398 + index * 38;
    shape(slide, "roundRect", { left: 566, top, width: 248, height: 30 }, {
      fill: index % 2 === 0 ? "#FFFFFF" : "#F8FBFF",
      line: { style: "solid", fill: "#DDEBFA", width: 1 },
      borderRadius: "rounded-md",
    });
    text(slide, idx, { left: 584, top: top + 8, width: 66, height: 12 }, {
      size: 11,
      bold: true,
      color: C.ink,
      align: "center",
    });
    text(slide, tuple, { left: 672, top: top + 8, width: 116, height: 12 }, {
      size: 11,
      bold: true,
      color: C.ink,
      align: "center",
    });
  });
  text(slide, "按共同前缀组织，合并公共路径。", {
    left: 572,
    top: 520,
    width: 236,
    height: 32,
  }, {
    size: 13,
    bold: true,
    color: "#0F9F8F",
    align: "center",
  });

  text(slide, "→", { left: 844, top: 354, width: 34, height: 44 }, {
    size: 42,
    bold: true,
    color: C.qwen,
    align: "center",
  });

  card(884, panelTop, 320, panelH, "", "", {
    fill: "#F8FBFF",
  });
  shape(slide, "ellipse", { left: 902, top: 216, width: 34, height: 34 }, {
    fill: C.qwen,
    line: noLine(),
  });
  text(slide, "3", { left: 902, top: 224, width: 34, height: 16 }, {
    size: 13,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "构建后的 Trie", { left: 948, top: 222, width: 210, height: 22 }, {
    size: 16,
    bold: true,
    color: C.qwen,
  });
  text(slide, "同一前缀只存一次，解码时按层查询", { left: 948, top: 252, width: 210, height: 16 }, {
    size: 10.5,
    color: C.grayText,
  });
  const node = (label, left, top, width, fill, color = C.ink) => {
    shape(slide, "roundRect", { left, top, width, height: 34 }, {
      fill,
      line: { style: "solid", fill: "#BDE0FF", width: 1 },
      borderRadius: "rounded-md",
    });
    text(slide, label, { left, top: top + 8, width, height: 14 }, {
      size: 11,
      bold: true,
      color,
      align: "center",
    });
  };
  node("L0: 优质题目/高中/地理", 950, 280, 188, "#EEF6FF", "#1677FF");
  text(slide, "↓ allowed: {0}", { left: 994, top: 322, width: 100, height: 16 }, {
    size: 10,
    bold: true,
    color: C.green,
    align: "center",
  });
  node("a = 0", 1000, 350, 88, "#F0FFF6", C.green);
  text(slide, "↙ allowed: {1,2} ↘", { left: 962, top: 392, width: 164, height: 16 }, {
    size: 10,
    bold: true,
    color: C.green,
    align: "center",
  });
  node("b = 1", 924, 422, 82, "#F4F1FF", C.qwen);
  node("b = 2", 1080, 422, 82, "#F4F1FF", C.qwen);
  text(slide, "↙ {2,3} ↘", { left: 910, top: 464, width: 110, height: 16 }, {
    size: 10,
    bold: true,
    color: C.green,
    align: "center",
  });
  text(slide, "↓ {0}", { left: 1104, top: 464, width: 40, height: 16 }, {
    size: 10,
    bold: true,
    color: C.green,
    align: "center",
  });
  node("c = 2", 892, 492, 72, "#FFF7ED", C.orange);
  node("c = 3", 976, 492, 72, "#FFF7ED", C.orange);
  node("c = 0", 1086, 492, 72, "#FFF7ED", C.orange);

  shape(slide, "roundRect", { left: 76, top: 604, width: 1128, height: 52 }, {
    fill: "#FFF7ED",
    line: { style: "solid", fill: "#FDBA74", width: 1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "Trie 本质上回答：", {
    left: 112,
    top: 618,
    width: 156,
    height: 20,
  }, {
    size: 15,
    bold: true,
    color: C.orange,
  });
  text(slide, "allowed_next = Trie[(label_id, code_prefix)]", {
    left: 334,
    top: 616,
    width: 338,
    height: 24,
  }, {
    size: 16,
    bold: true,
    color: C.orange,
    align: "center",
  });
  text(slide, "每一步只沿真实存在的路径继续生成。", {
    left: 792,
    top: 618,
    width: 360,
    height: 20,
  }, {
    size: 14,
    bold: true,
    color: C.ink,
    align: "center",
  });
}

async function addConstrainedDecodingTrieSlide() {
  const previous = deck.slides.items[11];
  const { slide } = deck.slides.insert({ after: previous });
  await addQwenChrome(slide, "限制性解码：整体链路", "25");

  text(slide, "整体原则：先离线固化合法路径，再在生成时按任务路由逐步收敛 logits；约束失效时保持原生采样。", {
    left: 84,
    top: 148,
    width: 1040,
    height: 28,
  }, {
    size: 19,
    bold: true,
    color: C.ink,
  });

  const stepCard = (index, title, subtitle, left, width, color, fill) => {
    shape(slide, "roundRect", { left, top: 202, width, height: 376 }, {
      fill,
      line: { style: "solid", fill: color, width: 1.2 },
      shadow: "shadow-sm",
      borderRadius: "rounded-lg",
    });
    shape(slide, "ellipse", { left: left + 14, top: 218, width: 34, height: 34 }, {
      fill: color,
      line: noLine(),
    });
    text(slide, String(index), { left: left + 14, top: 226, width: 34, height: 16 }, {
      size: 13,
      bold: true,
      color: "#FFFFFF",
      align: "center",
    });
    text(slide, title, { left: left + 58, top: 222, width: width - 76, height: 22 }, {
      size: 16,
      bold: true,
      color,
    });
    text(slide, subtitle, { left: left + 58, top: 250, width: width - 82, height: 18 }, {
      size: 10,
      color: C.body,
    });
  };

  const bullet = (left, top, title, body, color, width = 170) => {
    shape(slide, "ellipse", { left, top: top + 4, width: 7, height: 7 }, { fill: color, line: noLine() });
    text(slide, title, { left: left + 16, top, width, height: 14 }, {
      size: 10.5,
      bold: true,
      color,
    });
    text(slide, body, { left: left + 16, top: top + 16, width, height: 24 }, {
      size: 9.5,
      color: C.body,
    });
  };

  const miniBox = (left, top, width, title, body, color, fill = "#FFFFFF") => {
    shape(slide, "roundRect", { left, top, width, height: 38 }, {
      fill,
      line: { style: "solid", fill: "#D7E8F7", width: 1 },
      borderRadius: "rounded-md",
    });
    text(slide, title, { left: left + 10, top: top + 5, width: width - 20, height: 12 }, {
      size: 9.5,
      bold: true,
      color,
      align: "center",
    });
    text(slide, body, { left: left + 10, top: top + 21, width: width - 20, height: 10 }, {
      size: 8.5,
      color: C.body,
      align: "center",
    });
  };

  const flowBox = (left, top, width, label, fill = "#FFFFFF") => {
    shape(slide, "roundRect", { left, top, width, height: 28 }, {
      fill,
      line: { style: "solid", fill: "#D9CFFF", width: 1 },
      borderRadius: "rounded-md",
    });
    text(slide, label, { left: left + 8, top: top + 7, width: width - 16, height: 12 }, {
      size: 9.5,
      bold: true,
      color: C.body,
      align: "center",
    });
  };

  stepCard(1, "离线准备", "所有合法 Item SID 集合先离线解析", 84, 222, "#1677FF", "#F8FBFF");
  bullet(108, 282, "输入", "所有合法 Item SID 集合", "#1677FF", 154);
  bullet(108, 322, "解析", "标签（类型 / 学段 / 学科）+ 分层码", "#1677FF", 166);
  bullet(108, 362, "映射", "标签元组 → label_id", "#1677FF", 154);
  bullet(108, 402, "构建", "SidTrie", "#1677FF", 154);
  bullet(108, 442, "结果", "allowed[(label_id, *code_prefix)] → 合法下一层 code 集合", "#1677FF", 170);
  bullet(108, 498, "持久化", "存为 .ptrie.pkl，库未更新则复用", "#1677FF", 164);
  shape(slide, "roundRect", { left: 110, top: 542, width: 164, height: 24 }, {
    fill: "#EEF6FF",
    line: { style: "solid", fill: "#BDE0FF", width: 1 },
    borderRadius: "rounded-md",
  });
  text(slide, "合法 SID 集合  →  SidTrie", { left: 118, top: 549, width: 148, height: 10 }, {
    size: 9.5,
    bold: true,
    color: "#1677FF",
    align: "center",
  });

  text(slide, "→", { left: 312, top: 364, width: 28, height: 30 }, {
    size: 24,
    bold: true,
    color: C.grayText,
    align: "center",
  });

  stepCard(2, "请求路由", "从 prompt 中识别任务 marker", 344, 206, "#0F9F8F", "#F0FFF6");
  bullet(368, 292, "匹配任务", "从 system prompt / prompt 中匹配任务 marker", "#0F9F8F", 142);
  bullet(368, 346, "注入约束", "命中 marker → 注入对应 logits processor", "#0F9F8F", 142);
  bullet(368, 400, "任务隔离", "不同任务可挂不同 Trie", "#0F9F8F", 142);
  miniBox(374, 444, 150, "text2sid（IU）", "挂完整物品库", "#0F9F8F", "#F0FFFA");
  miniBox(374, 492, 150, "i2i_rec", "题目类只挂优质题库", "#0F9F8F", "#F0FFFA");
  miniBox(374, 540, 150, "未命中 marker", "不生效，原样生成", C.grayText, "#FFFFFF");

  text(slide, "→", { left: 554, top: 364, width: 28, height: 30 }, {
    size: 24,
    bold: true,
    color: C.grayText,
    align: "center",
  });

  stepCard(3, "在线逐步约束（Trie 限制）", "每个 token 生成前动态计算 allowed_next", 586, 310, C.qwen, "#F8F6FF");
  const flowLeft = 614;
  const flowWidth = 254;
  [
    "在最近窗口内定位当前 <|item_begin|>",
    "识别当前是否处于 SID 块内",
    "解析已生成的标签前缀与 code_prefix",
    "查 label_id",
    "查询 Trie: allowed_next(id, prefix)",
    "将 logits 中不合法的下一个码 mask 为 -inf",
  ].forEach((label, index) => {
    const top = 288 + index * 38;
    flowBox(flowLeft, top, flowWidth, label, index === 4 ? "#F0FFF6" : "#FFFFFF");
    if (index < 5) {
      text(slide, "↓", { left: 732, top: top + 27, width: 18, height: 12 }, {
        size: 10,
        bold: true,
        color: C.grayText,
        align: "center",
      });
    }
  });
  shape(slide, "roundRect", { left: 614, top: 520, width: flowWidth, height: 28 }, {
    fill: C.qwen,
    line: noLine(),
    borderRadius: "rounded-md",
  });
  text(slide, "只保留题库真实存在的下一层码", { left: 626, top: 528, width: flowWidth - 24, height: 12 }, {
    size: 10,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  shape(slide, "roundRect", { left: 614, top: 552, width: flowWidth, height: 18 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#D9CFFF", width: 1 },
    borderRadius: "rounded-md",
  });
  text(slide, "前缀不合法 / 不在 SID 块 / 无法解析 → 放弃约束，原样放行", { left: 622, top: 556, width: flowWidth - 16, height: 9 }, {
    size: 7.5,
    bold: true,
    color: C.qwen,
    align: "center",
  });

  text(slide, "→", { left: 902, top: 364, width: 28, height: 30 }, {
    size: 24,
    bold: true,
    color: C.grayText,
    align: "center",
  });

  stepCard(4, "可选去重剪枝", "I2I 多 SID 场景尽量减少重复，但绝不卡死", 932, 272, C.orange, "#FFF9F2");
  bullet(958, 292, "收集已完成 SID", "收集本次请求中已经完整生成过的 SID", C.orange, 184);
  bullet(958, 352, "检查候选子树", "对当前候选码，检查其子树中是否还有未生成过的完整 SID", C.orange, 184);
  bullet(958, 424, "子树吐尽则剪枝", "若某个分支子树已吐尽，则临时剪掉该候选", C.orange, 184);
  bullet(958, 484, "剪空回退", "若全部剪空，则回退到原 allowed 集合", C.orange, 184);
  shape(slide, "roundRect", { left: 958, top: 524, width: 184, height: 28 }, {
    fill: "#FFF7ED",
    line: { style: "solid", fill: "#FDBA74", width: 1 },
    borderRadius: "rounded-md",
  });
  text(slide, "目标：合法优先，多样性次之，稳定返回", { left: 968, top: 532, width: 164, height: 11 }, {
    size: 9,
    bold: true,
    color: C.orange,
    align: "center",
  });

  shape(slide, "roundRect", { left: 84, top: 592, width: 1120, height: 62 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#D7E8F7", width: 1.1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  const principles = [
    ["1. Trie 保证 SID 合法", "逐层限制，只保留题库真实存在的下一层码。", "#1677FF"],
    ["2. 去重剪枝减少重复", "多 SID 推荐中尽量避免重复生成，提升覆盖与信息密度。", "#0F9F8F"],
    ["3. 兜底机制保证鲁棒", "约束无法可靠生效时放弃约束，避免死锁或无结果。", C.qwen],
  ];
  principles.forEach(([title, body, color], index) => {
    const left = 108 + index * 356;
    shape(slide, "ellipse", { left, top: 609, width: 30, height: 30 }, {
      fill: color,
      line: noLine(),
    });
    text(slide, String(index + 1), { left, top: 617, width: 30, height: 12 }, {
      size: 9,
      bold: true,
      color: "#FFFFFF",
      align: "center",
    });
    text(slide, title, { left: left + 42, top: 606, width: 230, height: 16 }, {
      size: 13,
      bold: true,
      color,
    });
    text(slide, body, { left: left + 42, top: 626, width: 250, height: 16 }, {
      size: 9.5,
      color: C.body,
    });
  });

  shape(slide, "roundRect", { left: 84, top: 662, width: 1078, height: 24 }, {
    fill: "#0B55D9",
    line: noLine(),
    borderRadius: "rounded-md",
  });
  text(slide, "核心：优先保证生成路径合法，其次通过剪枝控制重复，最后用放行兜底保证服务稳定。", {
    left: 118,
    top: 668,
    width: 1010,
    height: 12,
  }, {
    size: 11,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
}

function updateConstrainedEffectSlideAfterInsert() {
  const slide = deck.slides.items[13];
  replaceFirstText(slide, "25", "26");
  deleteObjectsInBox(slide, { left: 70, top: 132, width: 1130, height: 520 });

  text(slide, "限制性解码同步提升 SID 可用性、I2I 结构化指标，并带来推荐质量改善。", {
    left: 84,
    top: 148,
    width: 980,
    height: 28,
  }, {
    size: 21,
    bold: true,
    color: C.ink,
  });

  shape(slide, "roundRect", { left: 84, top: 198, width: 520, height: 176 }, {
    fill: "#F8FBFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "物品理解：SID 有效性显著提升", { left: 110, top: 218, width: 350, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  text(slide, "类型/文本指标基本稳定，重点改善三级 SID 与反查可用性。", {
    left: 110,
    top: 246,
    width: 420,
    height: 18,
  }, {
    size: 12,
    color: C.body,
  });
  const iuCols = [
    ["样本", 110, 72],
    ["三级 SID", 204, 112],
    ["SID 有效", 328, 104],
    ["回退有效", 440, 104],
  ];
  iuCols.forEach(([label, left, width]) => {
    text(slide, label, { left, top: 278, width, height: 18 }, {
      size: 12,
      bold: true,
      color: C.grayText,
      align: left === 110 ? undefined : "center",
    });
  });
  [
    ["hot", "3.9% → 12.1%", "17.0% → 100%", "94.3% → 100%"],
    ["tail", "1.8% → 15.8%", "12.1% → 100%", "84.5% → 100%"],
  ].forEach(([name, sid3, valid, fallback], index) => {
    const top = 306 + index * 36;
    shape(slide, "roundRect", { left: 104, top: top - 3, width: 474, height: 28 }, {
      fill: index === 0 ? "#FFFFFF" : "#F2F7FC",
      line: { style: "solid", fill: "#E2EDF8", width: 1 },
      borderRadius: "rounded-md",
    });
    text(slide, name, { left: 116, top, width: 64, height: 18 }, {
      size: 13,
      bold: true,
      color: C.ink,
    });
    [
      [sid3, 194, 128],
      [valid, 322, 114],
      [fallback, 438, 120],
    ].forEach(([value, left, width]) => {
      text(slide, value, { left, top, width, height: 18 }, {
        size: 12,
        bold: true,
        color: C.green,
        align: "center",
      });
    });
  });

  shape(slide, "roundRect", { left: 636, top: 198, width: 540, height: 176 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#D7E8F7", width: 1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "I2I 推荐：结构化指标显著改善", { left: 662, top: 218, width: 370, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  text(slide, "baseline with cd 后，去重率和 SID 有效率成为主要收益。", {
    left: 662,
    top: 246,
    width: 420,
    height: 18,
  }, {
    size: 12,
    color: C.body,
  });
  const i2iRows = [
    ["SID 去重率", "40.8%", "97.2%", "+138%", 0.408, 0.972],
    ["SID 有效率", "46.5%", "100.0%", "+115%", 0.465, 1],
    ["回退有效率", "98.3%", "100.0%", "+1.7%", 0.983, 1],
  ];
  i2iRows.forEach(([label, before, after, delta, beforeRatio, afterRatio], index) => {
    const y = 290 + index * 28;
    text(slide, label, { left: 664, top: y - 4, width: 112, height: 18 }, {
      size: 13,
      bold: true,
      color: C.ink,
    });
    shape(slide, "roundRect", { left: 790, top: y, width: 184, height: 8 }, {
      fill: "#E5E7EB",
      line: noLine(),
      borderRadius: "rounded-full",
    });
    shape(slide, "roundRect", { left: 790, top: y, width: 184 * beforeRatio, height: 8 }, {
      fill: "#A3A8B8",
      line: noLine(),
      borderRadius: "rounded-full",
    });
    shape(slide, "roundRect", { left: 790, top: y + 12, width: 184, height: 8 }, {
      fill: "#E5E7EB",
      line: noLine(),
      borderRadius: "rounded-full",
    });
    shape(slide, "roundRect", { left: 790, top: y + 12, width: 184 * afterRatio, height: 8 }, {
      fill: C.qwen,
      line: noLine(),
      borderRadius: "rounded-full",
    });
    text(slide, before, { left: 986, top: y - 6, width: 62, height: 16 }, {
      size: 11,
      color: C.grayText,
    });
    text(slide, after, { left: 986, top: y + 7, width: 62, height: 16 }, {
      size: 11,
      bold: true,
      color: C.qwen,
    });
    text(slide, delta, { left: 1062, top: y, width: 70, height: 18 }, {
      size: 13,
      bold: true,
      color: C.green,
      align: "right",
    });
  });

  shape(slide, "roundRect", { left: 84, top: 402, width: 1092, height: 174 }, {
    fill: "#F8FBFF",
    line: { style: "solid", fill: "#D7E8F7", width: 1 },
    shadow: "shadow-sm",
    borderRadius: "rounded-lg",
  });
  text(slide, "LLM-Judge：推荐质量小幅提升，CoT 文本质量基本稳定", {
    left: 110,
    top: 422,
    width: 540,
    height: 24,
  }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  const judgeMetrics = [
    ["表达清晰", "4.83", "4.86", "+0.6%"],
    ["提取推理", "4.49", "4.47", "-0.4%"],
    ["step2一致", "4.18", "4.07", "-2.6%"],
    ["关联效度", "3.08", "3.16", "+2.6%"],
    ["理由忠实", "2.87", "2.96", "+3.1%"],
    ["排序合理", "2.92", "3.08", "+5.5%"],
  ];
  judgeMetrics.forEach(([label, before, after, delta], index) => {
    const left = 110 + index * 174;
    shape(slide, "roundRect", { left, top: 464, width: 152, height: 80 }, {
      fill: "#FFFFFF",
      line: { style: "solid", fill: "#E2EDF8", width: 1 },
      shadow: "shadow-sm",
      borderRadius: "rounded-lg",
    });
    text(slide, label, { left: left + 12, top: 476, width: 128, height: 18 }, {
      size: 13,
      bold: true,
      color: C.ink,
      align: "center",
    });
    text(slide, `${before} → ${after}`, { left: left + 12, top: 502, width: 128, height: 20 }, {
      size: 16,
      bold: true,
      color: delta.startsWith("+") ? C.green : C.grayText,
      align: "center",
    });
    text(slide, delta, { left: left + 12, top: 526, width: 128, height: 16 }, {
      size: 11,
      bold: true,
      color: delta.startsWith("+") ? C.green : C.grayText,
      align: "center",
    });
  });

  shape(slide, "roundRect", { left: 186, top: 604, width: 908, height: 44 }, {
    fill: "#F0FFF6",
    line: { style: "solid", fill: "#A7F3D0", width: 1 },
    borderRadius: "rounded-full",
  });
  text(slide, "结论：限制性解码主要降低结构非法、SID 幻觉和重复问题，并带来推荐质量指标改善。", {
    left: 222,
    top: 616,
    width: 836,
    height: 20,
  }, {
    size: 15,
    bold: true,
    color: C.ink,
    align: "center",
  });
}

function refineTrainingEfficiencySlide() {
  const slide = deck.slides.items[6];
  deleteObjectsInBox(slide, { left: 130, top: 410, width: 1020, height: 220 });

  shape(slide, "roundRect", { left: 148, top: 414, width: 984, height: 196 }, {
    fill: C.panel,
    line: { style: "solid", fill: C.line, width: 1.2 },
    shadow: "shadow-sm",
    radius: 8,
  });
  shape(slide, "rect", { left: 148, top: 414, width: 984, height: 5 }, {
    fill: C.qwen,
    line: noLine(),
  });
  text(slide, "训练效率优化", { left: 170, top: 434, width: 220, height: 30 }, {
    size: 24,
    bold: true,
    color: C.green,
  });
  text(slide, "数据分片并行读入 + selective 重计算 + DP 通信重叠", { left: 170, top: 468, width: 520, height: 22 }, {
    size: 16,
    color: C.body,
  });
  text(slide, "同等数据下训练耗时", { left: 900, top: 438, width: 190, height: 22 }, {
    size: 16,
    bold: true,
    color: C.ink,
    align: "right",
  });

  shape(slide, "rect", { left: 170, top: 508, width: 922, height: 1.2 }, {
    fill: "#D8E9F8",
    line: noLine(),
  });
  addTimeBar(slide, { label: "CPT", reduction: "-23.0%", optimized: 0.77, top: 520, left: 170 });
  addTimeBar(slide, { label: "SFT", reduction: "-57.4%", optimized: 0.426, top: 558, left: 170 });
}

await replacePipelineImage();
await refineTokenizerIntroSlide();
refineSidCaseImages();
refineItemUnderstandingSlide();
refineGeneralCapabilitySlide();
refineI2IRecommendationSlide();
refineEvaluationProblemsSlide();
refineConstrainedDecodingFlowSlide();
await addConstrainedDecodingTrieSlide();
updateConstrainedEffectSlideAfterInsert();
refineTrainingStageCards();
refineTrainingEfficiencySlide();

await saveSectionDeck("04", deck);
