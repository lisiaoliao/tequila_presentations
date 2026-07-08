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
    shape(slide, "roundRect", { left: card.left, top: 198, width: 522, height: 150 }, {
      fill: "#F8FBFF",
      line: { style: "solid", fill: "#C7E9FF", width: 1.1 },
      shadow: "shadow-sm",
      radius: 8,
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

  const pipelineImage = path.join(ROOT, "assets", "summary", "thinking-summary-pipeline.png");
  await image(slide, pipelineImage, { left: 70, top: 404, width: 1080, height: 302 }, "教育 OneRec 基座模型训练 pipeline");
}

async function addAppendixBaseSlide(marker, title) {
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
  return slide;
}

async function addAppendixSlide({ marker, title, imageFile, imagePosition, imageAlt }) {
  const slide = await addAppendixBaseSlide(marker, title);
  await image(slide, imageFile, imagePosition, imageAlt);
  return slide;
}

function tableCell(slide, value, position, opts = {}) {
  shape(slide, "rect", position, {
    fill: opts.fill ?? "#FFFFFF",
    line: { style: "solid", fill: opts.line ?? "#E4E7EC", width: opts.lineWidth ?? 1 },
  });
  text(slide, value, {
    left: position.left + (opts.padX ?? 8),
    top: position.top + (opts.padY ?? 8),
    width: position.width - 2 * (opts.padX ?? 8),
    height: position.height - 2 * (opts.padY ?? 8),
  }, {
    size: opts.size ?? 12,
    bold: opts.bold ?? false,
    color: opts.color ?? "#15192F",
    align: opts.align,
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
  });
}

async function addOptimizationPitSummarySlide() {
  const slide = await addAppendixBaseSlide("A6", "附录 | 通用能力优化的坑");

  shape(slide, "roundRect", { left: 82, top: 148, width: 1116, height: 112 }, {
    fill: "#FFF6F5",
    line: { style: "solid", fill: "#FFD4D0", width: 1.2 },
    shadow: "shadow-sm",
  });
  text(slide, "通用能力优化的核心坑：环境必须严格一致", {
    left: 122,
    top: 178,
    width: 800,
    height: 30,
  }, {
    size: 23,
    bold: true,
    color: "#14113D",
  });
  text(slide, "不要把通用能力下降先归因到数据或训练策略，先排查版本和推理参数。", {
    left: 122,
    top: 218,
    width: 820,
    height: 24,
  }, {
    size: 17,
    color: "#5A6078",
  });
  shape(slide, "rect", { left: 1000, top: 148, width: 198, height: 112 }, {
    fill: "#D92D20",
    line: noLine(),
  });
  text(slide, "先验检查", { left: 1028, top: 175, width: 142, height: 28 }, {
    size: 24,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  text(slide, "版本 / 参数 / schema", { left: 1028, top: 211, width: 142, height: 22 }, {
    size: 15,
    color: "#FFFFFF",
    align: "center",
  });

  const pits = [
    {
      no: "01",
      title: "新 token 注册版本不兼容",
      body: "注册阶段使用 transformer > 5.0，但训练/推理环境 < 5.0，生成的 config.json 中 rope_parameters schema 不被识别。",
    },
    {
      no: "02",
      title: "位置编码错误会放大为通用能力下降",
      body: "训练和推理链路会在错误的位置编码下运行，通用任务性能会受到显著影响。",
    },
    {
      no: "03",
      title: "推理重复惩罚不能默认打开",
      body: "frequency_penalty 会抑制重复，但也会压低通用任务性能，需要按任务验证后再使用。",
    },
  ];

  pits.forEach((pit, index) => {
    const top = 306 + index * 86;
    shape(slide, "rect", { left: 120, top, width: 84, height: 58 }, { fill: index === 0 ? "#D92D20" : "#FFE3E0" });
    text(slide, pit.no, { left: 120, top: top + 12, width: 84, height: 28 }, {
      size: 24,
      bold: true,
      color: index === 0 ? "#FFFFFF" : "#D92D20",
      align: "center",
    });
    shape(slide, "rect", { left: 204, top, width: 840, height: 58 }, {
      fill: index % 2 === 0 ? "#FFFFFF" : "#FAFBFF",
      line: { style: "solid", fill: "#E4E7EC", width: 1 },
    });
    text(slide, pit.title, { left: 230, top: top + 8, width: 760, height: 22 }, {
      size: 17,
      bold: true,
      color: "#14113D",
    });
    text(slide, pit.body, { left: 230, top: top + 33, width: 770, height: 18 }, {
      size: 13.5,
      color: "#5A6078",
    });
  });

  shape(slide, "roundRect", { left: 110, top: 594, width: 1060, height: 56 }, {
    fill: "#F2F4FF",
    line: { style: "solid", fill: "#C8C1FF", width: 1 },
  });
  text(slide, "落地原则：通用能力问题先做环境一致性复核，再比较训练策略收益。", {
    left: 150,
    top: 611,
    width: 980,
    height: 22,
  }, {
    size: 18,
    bold: true,
    color: "#14113D",
    align: "center",
  });
}

async function addTokenizerPitTableSlide() {
  const slide = await addAppendixBaseSlide("A7", "附录 | Tokenizer 优化的收益与代价");

  text(slide, "Tokenizer 优化解决的是码本分配问题，但下游效果还受语义稳定性约束。", {
    left: 116,
    top: 138,
    width: 1048,
    height: 30,
  }, {
    size: 22,
    bold: true,
    color: "#14113D",
    align: "center",
  });

  const tags = [
    ["KMeans init", "起点贴近分布"],
    ["EMA + restart", "提升码本利用率"],
    ["Sinkhorn", "平衡 token 分布"],
  ];
  tags.forEach(([title, desc], index) => {
    const left = 146 + index * 336;
    shape(slide, "roundRect", { left, top: 192, width: 284, height: 52 }, {
      fill: index === 1 ? "#635BFF" : "#F3F0FF",
      line: { style: "solid", fill: "#C8C1FF", width: 1 },
    });
    text(slide, title, { left: left + 18, top: 204, width: 126, height: 20 }, {
      size: 15,
      bold: true,
      color: index === 1 ? "#FFFFFF" : "#635BFF",
    });
    text(slide, desc, { left: left + 142, top: 204, width: 118, height: 20 }, {
      size: 13.5,
      color: index === 1 ? "#FFFFFF" : "#5A6078",
      align: "right",
    });
  });

  const left = 78;
  const top = 284;
  const widths = [276, 148, 148, 148, 150, 206];
  const rowH = 52;
  const headers = ["优化", "利用率 L1", "利用率 L2", "利用率 L3", "碰撞率", "带前缀碰撞率"];
  const rows = [
    ["baseline\n(2048*3)", "92.24%", "59.57%", "32.52%", "10.14%", "8.17%"],
    ["+ KMeans init\n(2048*3)", "94.09%\n(+2.0%)", "90.14%\n(+51.3%)", "77.49%\n(+138.3%)", "9.57%\n(-5.6%)", "8.52%\n(+4.3%)"],
    ["+ EMA + dead-code restart\n(2048*3)", "100.00%\n(+6.3%)", "100.00%\n(+10.9%)", "100.00%\n(+29.0%)", "4.27%\n(-55.4%)", "3.12%\n(-63.3%)"],
    ["+ Sinkhorn\n(2048*3)", "100.00%\n(+0.0%)", "100.00%\n(+0.0%)", "100.00%\n(+0.0%)", "4.25%\n(-0.6%)", "3.28%\n(+5.1%)"],
  ];

  let x = left;
  headers.forEach((header, index) => {
    tableCell(slide, header, { left: x, top, width: widths[index], height: 42 }, {
      fill: "#F0EDFF",
      bold: true,
      size: 13,
      align: "center",
      line: "#C8C1FF",
    });
    x += widths[index];
  });

  rows.forEach((row, rowIndex) => {
    x = left;
    row.forEach((value, index) => {
      tableCell(slide, value, { left: x, top: top + 42 + rowIndex * rowH, width: widths[index], height: rowH }, {
        fill: rowIndex % 2 === 0 ? "#FFFFFF" : "#F8FBFF",
        size: index === 0 ? 12.5 : 12,
        bold: index === 0,
        align: index === 0 ? undefined : "center",
      });
      x += widths[index];
    });
  });

  shape(slide, "rect", { left: 86, top: 560, width: 8, height: 70 }, { fill: "#635BFF" });
  text(slide, "关键结论", { left: 112, top: 560, width: 124, height: 24 }, {
    size: 18,
    bold: true,
    color: "#635BFF",
  });
  text(slide, "SID 质量与下游任务性能并非单调正相关；码本容量存在“表征分辨率 vs. 可学习性”的权衡。", {
    left: 244,
    top: 558,
    width: 880,
    height: 56,
  }, {
    size: 18,
    bold: true,
    color: "#14113D",
  });
}

async function addTrainingPitTableSlide() {
  const slide = await addAppendixBaseSlide("A8", "附录 | 训练优化的收益与代价");

  text(slide, "训练优化的取舍：SID 指标变好，不代表推荐质量同步变好。", {
    left: 120,
    top: 140,
    width: 1040,
    height: 30,
  }, {
    size: 23,
    bold: true,
    color: "#14113D",
    align: "center",
  });

  shape(slide, "roundRect", { left: 98, top: 198, width: 500, height: 120 }, {
    fill: "#F0FFF7",
    line: { style: "solid", fill: "#B8F0D0", width: 1 },
    shadow: "shadow-sm",
  });
  text(slide, "看起来变好的指标", { left: 128, top: 220, width: 260, height: 24 }, {
    size: 20,
    bold: true,
    color: "#08A34A",
  });
  text(slide, "长尾物品 SID 有效率：0.121 → 0.259\nI2I SID 有效率：46.5% → 65.7%", {
    left: 128,
    top: 256,
    width: 420,
    height: 46,
  }, {
    size: 17,
    color: "#2F3650",
  });

  shape(slide, "roundRect", { left: 682, top: 198, width: 500, height: 120 }, {
    fill: "#FFF6F5",
    line: { style: "solid", fill: "#FFD4D0", width: 1 },
    shadow: "shadow-sm",
  });
  text(slide, "实际下降的质量", { left: 712, top: 220, width: 260, height: 24 }, {
    size: 20,
    bold: true,
    color: "#D92D20",
  });
  text(slide, "LLM-Judge 关联效度：3.08 → 2.83\n理由忠实度：2.87 → 2.63", {
    left: 712,
    top: 256,
    width: 420,
    height: 46,
  }, {
    size: 17,
    color: "#2F3650",
  });

  text(slide, "提升 SID 记忆", { left: 498, top: 341, width: 160, height: 22 }, {
    size: 15,
    bold: true,
    color: "#08A34A",
    align: "center",
  });
  shape(slide, "rect", { left: 500, top: 370, width: 280, height: 4 }, { fill: "#B8F0D0" });
  text(slide, "推荐质量下降", { left: 622, top: 384, width: 160, height: 22 }, {
    size: 15,
    bold: true,
    color: "#D92D20",
    align: "center",
  });

  const tableConfigs = [
    {
      title: "物品理解长尾指标",
      left: 96,
      top: 430,
      headers: ["模型", "SID 前缀准确率", "SID 有效率", "回退有效率"],
      rows: [
        ["baseline tail", "[0.667, 0.228, 0.018]", "0.121", "0.845"],
        ["放大 loss 权重 tail", "[0.684, 0.281, 0.105]", "0.207", "0.879"],
        ["分层学习率 tail", "[0.684, 0.298, 0.123]", "0.259", "0.879"],
      ],
    },
    {
      title: "I2I 结构化指标",
      left: 96,
      top: 574,
      headers: ["模型", "SID 去重率", "SID 有效率", "回退有效率"],
      rows: [
        ["baseline", "40.8%", "46.5%", "98.3%"],
        ["放大 loss 权重", "30.4%", "65.7%", "98.9%"],
        ["分层学习率", "25.7%", "64.9%", "98.7%"],
      ],
    },
    {
      title: "LLM-Judge 推荐质量",
      left: 682,
      top: 430,
      headers: ["模型", "关联效度", "理由忠实度", "排序合理性"],
      rows: [
        ["baseline", "3.08", "2.87", "2.92"],
        ["放大 loss 权重", "2.93", "2.73", "2.85"],
        ["分层学习率", "2.83", "2.63", "2.77"],
      ],
    },
  ];

  const widths = [132, 170, 130, 126];
  tableConfigs.forEach((config) => {
    text(slide, config.title, { left: config.left, top: config.top - 28, width: 460, height: 22 }, {
      size: 16,
      bold: true,
      color: "#635BFF",
    });
    let x = config.left;
    config.headers.forEach((header, index) => {
      tableCell(slide, header, { left: x, top: config.top, width: widths[index], height: 30 }, {
        fill: "#F0EDFF",
        bold: true,
        size: 10.5,
        align: "center",
        line: "#C8C1FF",
      });
      x += widths[index];
    });
    config.rows.forEach((row, rowIndex) => {
      x = config.left;
      row.forEach((value, index) => {
        tableCell(slide, value, { left: x, top: config.top + 30 + rowIndex * 30, width: widths[index], height: 30 }, {
          fill: rowIndex % 2 === 0 ? "#FFFFFF" : "#F8FBFF",
          size: index === 1 && config.title === "物品理解长尾指标" ? 9.5 : 10.2,
          bold: index === 0,
          align: index === 0 ? undefined : "center",
        });
        x += widths[index];
      });
    });
  });
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
  await addOptimizationPitSummarySlide();
  await addTokenizerPitTableSlide();
  await addTrainingPitTableSlide();
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
