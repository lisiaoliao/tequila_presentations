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
  return slide.images.add({
    blob: await blobFor(imagePath),
    contentType: "image/png",
    alt,
    fit: opts.fit ?? "contain",
    position,
  });
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
    typeface: "PingFang SC",
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
    { left: 74, top: 302, width: 664, height: 258 },
    "RQ-VAE tokenizer architecture",
  );

  shape(slide, "roundRect", { left: 770, top: 302, width: 398, height: 134 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1.2 },
    shadow: "shadow-sm",
  });
  text(slide, "SID 结构", { left: 798, top: 322, width: 160, height: 26 }, {
    size: 21,
    bold: true,
    color: C.ink,
  });
  shape(slide, "roundRect", { left: 798, top: 358, width: 324, height: 48 }, {
    fill: "#F3F9FF",
    line: { style: "solid", fill: "#D7E8F7", width: 1 },
  });
  text(slide, "<|item_begin|> 类型, 学段, 学科,", { left: 814, top: 365, width: 292, height: 18 }, {
    size: 14,
    bold: true,
    color: "#1677FF",
  });
  text(slide, "<a_x><b_y><c_z> <|item_end|>", { left: 814, top: 385, width: 292, height: 18 }, {
    size: 14,
    bold: true,
    color: "#1677FF",
  });
  text(slide, "边界符限定生成范围；文本标签提供类型约束；SID 承载离散语义索引。", {
    left: 798,
    top: 414,
    width: 324,
    height: 18,
  }, {
    size: 11,
    color: C.body,
  });

  shape(slide, "roundRect", { left: 770, top: 460, width: 398, height: 134 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1.2 },
    shadow: "shadow-sm",
  });
  text(slide, "异构类型支持", { left: 798, top: 480, width: 200, height: 26 }, {
    size: 21,
    bold: true,
    color: C.ink,
  });
  addTypePill(slide, "题目", { left: 798, top: 520, width: 74, height: 32 }, true);
  addTypePill(slide, "试卷", { left: 888, top: 520, width: 74, height: 32 });
  addTypePill(slide, "视频", { left: 978, top: 520, width: 74, height: 32 });
  addTypePill(slide, "小讲堂", { left: 1068, top: 520, width: 82, height: 32 });
  text(slide, "同一词表空间支持题目、试卷、视频、小讲堂；训练时对高频题目降采样，对长尾类型过采样，避免单一题目类型主导。", {
    left: 798,
    top: 566,
    width: 336,
    height: 24,
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

  text(slide, "任务能力映射：数学与文本推理 / 通用任务 / 指令对齐", { left: 84, top: 188, width: 760, height: 22 }, {
    size: 17,
    bold: true,
    color: C.qwen,
  });

  shape(slide, "rect", { left, top, width: tableW, height: tableH }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: grid, width: 1.2 },
    shadow: "shadow-sm",
  });
  shape(slide, "rect", { left, top, width: tableW, height: groupH }, {
    fill: purple,
    line: noLine(),
  });
  shape(slide, "rect", { left: left + modelW, top: top + groupH, width: tableW - modelW, height: headerH }, {
    fill: "#F4F7FF",
    line: noLine(),
  });
  shape(slide, "rect", { left, top, width: modelW, height: groupH + headerH }, {
    fill: purple,
    line: noLine(),
  });
  shape(slide, "rect", { left, top: top + groupH + headerH + rowH, width: tableW, height: rowH }, {
    fill: stripe,
    line: noLine(),
  });
  shape(slide, "rect", { left, top: top + groupH + headerH + rowH * 2, width: tableW, height: rowH }, {
    fill: lightPurple,
    line: noLine(),
  });

  text(slide, "模型", { left: left + 18, top: top + 36, width: modelW - 36, height: 30 }, {
    size: 20,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "Math & Text Reasoning", { left: left + modelW, top: top + 13, width: metricW * 3, height: 22 }, {
    size: 18,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "General Tasks", { left: left + modelW + metricW * 3, top: top + 13, width: metricW * 2, height: 22 }, {
    size: 18,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "Alignment Tasks", { left: left + modelW + metricW * 5, top: top + 13, width: metricW, height: 22 }, {
    size: 15,
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
  [top + groupH, top + groupH + headerH, top + groupH + headerH + rowH, top + groupH + headerH + rowH * 2].forEach((y) => {
    shape(slide, "rect", { left, top: y, width: tableW, height: 1.2 }, {
      fill: grid,
      line: noLine(),
    });
  });

  shape(slide, "rect", { left: 152, top: 572, width: 976, height: 54 }, {
    fill: "#F7F8FF",
    line: { style: "solid", fill: "#D9D5FF", width: 1 },
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

function addPillMetric(slide, label, value, position, opts = {}) {
  shape(slide, "rect", position, {
    fill: opts.fill ?? "#EEFDF4",
    line: { style: "solid", fill: opts.line ?? "#BDECCF", width: 1 },
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
  const red = "#EF4444";
  text(slide, label, { left, top: top - 4, width: 144, height: 24 }, {
    size: 17,
    bold: true,
    color: C.ink,
  });
  shape(slide, "rect", { left: barLeft, top, width: 300, height: 14 }, {
    fill: "#E5E7EB",
    line: noLine(),
  });
  shape(slide, "rect", { left: barLeft, top, width: 300 * ratio, height: 14 }, {
    fill: opts.good ? C.green : red,
    line: noLine(),
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
  const width = 388;
  shape(slide, "rect", { left, top, width, height: 122 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#D7E8F7", width: 1 },
    shadow: "shadow-sm",
  });
  text(slide, title, { left: left + 20, top: top + 16, width: 150, height: 24 }, {
    size: 18,
    bold: true,
    color: C.ink,
  });
  text(slide, overall, { left: left + 286, top: top + 12, width: 72, height: 30 }, {
    size: 26,
    bold: true,
    color: C.qwen,
    align: "right",
  });
  text(slide, "综合", { left: left + 240, top: top + 19, width: 42, height: 18 }, {
    size: 13,
    color: C.grayText,
    align: "right",
  });

  const exactX = left + 22;
  const prefixX = left + 178;
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
  text(slide, delta, { left: left + 290, top: top + 78, width: 76, height: 22 }, {
    size: 16,
    bold: true,
    color: "#EF4444",
    align: "right",
  });
}

function refineEvaluationProblemsSlide() {
  const slide = deck.slides.items[10];
  deleteObjectsInBox(slide, { left: 70, top: 135, width: 1130, height: 500 });

  text(slide, "结构合规已达标，但有效 SID、去重与回退命中质量暴露真实推荐风险。", {
    left: 84,
    top: 148,
    width: 980,
    height: 28,
  }, {
    size: 21,
    bold: true,
    color: C.ink,
  });

  shape(slide, "rect", { left: 84, top: 198, width: 552, height: 142 }, {
    fill: "#F7FBFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1 },
    shadow: "shadow-sm",
  });
  text(slide, "结构化合规性", { left: 112, top: 218, width: 180, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  text(slide, "格式输出稳定，问题不在可解析性和任务约束。", { left: 296, top: 222, width: 300, height: 20 }, {
    size: 14,
    color: C.body,
  });
  addPillMetric(slide, "SID 可解析", "100%", { left: 112, top: 268, width: 160, height: 46 });
  addPillMetric(slide, "类型合规", "100%", { left: 292, top: 268, width: 160, height: 46 });
  addPillMetric(slide, "数量精确", "100%", { left: 472, top: 268, width: 160, height: 46 });

  shape(slide, "rect", { left: 84, top: 358, width: 552, height: 154 }, {
    fill: "#FFFFFF",
    line: { style: "solid", fill: "#E2E8F0", width: 1 },
    shadow: "shadow-sm",
  });
  text(slide, "暴露问题", { left: 112, top: 378, width: 160, height: 22 }, {
    size: 18,
    bold: true,
    color: C.ink,
  });
  text(slide, "合法格式之外，SID 仍会无效或重复。", { left: 256, top: 381, width: 310, height: 18 }, {
    size: 14,
    color: C.body,
  });
  addRiskMetric(slide, "SID 去重率", "40.8%", 0.408, 424, { barLeft: 268, valueLeft: 548 });
  addRiskMetric(slide, "SID 有效率", "46.5%", 0.465, 462, { barLeft: 268, valueLeft: 548 });
  addRiskMetric(slide, "回退有效率", "98.3%", 0.983, 500, { barLeft: 268, valueLeft: 548, good: true });

  shape(slide, "rect", { left: 674, top: 198, width: 474, height: 340 }, {
    fill: "#F8FBFF",
    line: { style: "solid", fill: "#CFE6FA", width: 1 },
    shadow: "shadow-sm",
  });
  text(slide, "推荐质量：精准命中 vs. 前缀回退", { left: 704, top: 218, width: 360, height: 24 }, {
    size: 19,
    bold: true,
    color: C.qwen,
  });
  text(slide, "LLM-Judge 1-5 分；prefix 可兜底，但质量明显低于 exact。", {
    left: 704,
    top: 248,
    width: 382,
    height: 20,
  }, {
    size: 14,
    color: C.body,
  });
  addQualityCard(slide, {
    title: "关联效度",
    overall: "3.08",
    exact: "3.57",
    prefix: "2.58",
    delta: "-0.99",
    top: 286,
  });
  addQualityCard(slide, {
    title: "理由忠实度",
    overall: "2.87",
    exact: "3.37",
    prefix: "2.35",
    delta: "-1.02",
    top: 408,
  });

  shape(slide, "rect", { left: 150, top: 548, width: 980, height: 62 }, {
    fill: "#F0EEFF",
    line: { style: "solid", fill: "#CFC9FF", width: 1 },
  });
  text(slide, "核心判断：结构合规说明模型会按格式输出；但无效/重复 SID 与 prefix 回退低分，说明必须在推理期限制 SID 空间并主动去重。", {
    left: 188,
    top: 568,
    width: 904,
    height: 24,
  }, {
    size: 16,
    bold: true,
    color: C.ink,
    align: "center",
  });
}

function refineTrainingEfficiencySlide() {
  const slide = deck.slides.items[6];
  deleteObjectsInBox(slide, { left: 130, top: 410, width: 1020, height: 220 });

  shape(slide, "rect", { left: 148, top: 414, width: 984, height: 196 }, {
    fill: C.panel,
    line: { style: "solid", fill: C.line, width: 1.2 },
    shadow: "shadow-sm",
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

await refineTokenizerIntroSlide();
refineGeneralCapabilitySlide();
refineEvaluationProblemsSlide();
refineTrainingEfficiencySlide();

await saveSectionDeck("04", deck);
