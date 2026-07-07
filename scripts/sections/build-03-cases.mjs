import fs from "node:fs/promises";
import path from "node:path";
import { buildSectionDeck, ROOT, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("03");

// Section-specific edits for 03 工作产出与案例 go here.
// This section owns: divider 03, capability summary, demo overview, six case slides.

const CASE_COMPARE_CROP_DIR = path.join(ROOT, "assets", "case_compare_crops");
const CASE_OUTPUT_CROP_DIR = path.join(ROOT, "assets", "case_output_crops");
const CASE_JUDGE_CROP_DIR = path.join(ROOT, "assets", "case_judge_crops");
const imageCache = new Map();
const imageRatioCache = new Map();

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function blobFor(imagePath) {
  if (!imageCache.has(imagePath)) {
    imageCache.set(imagePath, await readImageBlob(imagePath));
  }
  return imageCache.get(imagePath);
}

async function imageRatioFor(imagePath) {
  if (!imageRatioCache.has(imagePath)) {
    const bytes = await fs.readFile(imagePath);
    if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      imageRatioCache.set(imagePath, bytes.readUInt32BE(16) / bytes.readUInt32BE(20));
    } else {
      throw new Error(`Unsupported image format for ratio detection: ${imagePath}`);
    }
  }
  return imageRatioCache.get(imagePath);
}

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function textShapesOnSlide(slideNo) {
  return deck.slides.items[slideNo - 1].shapes.items.filter((shape) => String(shape.text ?? ""));
}

async function replaceExactText(current, next, { slide } = {}) {
  const slides = slide == null
    ? deck.slides.items.map((_, index) => index + 1)
    : [slide];
  const matches = slides.flatMap((slideNo) => {
    return textShapesOnSlide(slideNo)
      .filter((shape) => String(shape.text) === current)
      .map((shape) => ({ slideNo, shape }));
  });
  if (!matches.length) {
    throw new Error(`Text not found on slide ${slide ?? "*"}: ${current}`);
  }
  for (const match of matches) {
    match.shape.text = next;
  }
}

async function replaceRepeatedTextOnSlide(current, nextValues, { slide }) {
  const records = textShapesOnSlide(slide)
    .filter((shape) => String(shape.text) === current)
    .sort((a, b) => {
      const [aLeft, aTop] = [a.position?.left ?? 0, a.position?.top ?? 0];
      const [bLeft, bTop] = [b.position?.left ?? 0, b.position?.top ?? 0];
      return aTop - bTop || aLeft - bLeft;
    });
  if (records.length !== nextValues.length) {
    throw new Error(`Expected ${nextValues.length} matches on slide ${slide} for ${current}, found ${records.length}`);
  }
  records.forEach((shape, index) => {
    shape.text = nextValues[index];
  });
}

function addSlideNote(slide, value) {
  const note = slide.shapes.add({
    geometry: "textbox",
    position: { left: 148, top: 604, width: 984, height: 34 },
    fill: "none",
    line: noLine(),
  });
  note.text = value;
  note.text.style = {
    fontSize: 18,
    bold: true,
    color: "#17143D",
    typeface: "PingFang SC",
    alignment: "center",
    wrap: "square",
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
  };
}

function firstImageInBox(slide, box) {
  return slide.images.items.find((image) => {
    const p = image.position ?? {};
    const cx = (p.left ?? 0) + (p.width ?? 0) / 2;
    const cy = (p.top ?? 0) + (p.height ?? 0) / 2;
    return cx >= box.left && cx <= box.left + box.width && cy >= box.top && cy <= box.top + box.height;
  });
}

function centerInBox(position, box) {
  const cx = (position.left ?? 0) + (position.width ?? 0) / 2;
  const cy = (position.top ?? 0) + (position.height ?? 0) / 2;
  return cx >= box.left && cx <= box.left + box.width && cy >= box.top && cy <= box.top + box.height;
}

function fitPosition(currentPosition, frame) {
  const ratio = (currentPosition.width ?? frame.width) / (currentPosition.height ?? frame.height);
  return fitRatioInFrame(ratio, frame);
}

function fitRatioInFrame(ratio, frame) {
  const frameRatio = frame.width / frame.height;
  if (ratio >= frameRatio) {
    const height = frame.width / ratio;
    return {
      left: frame.left,
      top: frame.top + (frame.height - height) / 2,
      width: frame.width,
      height,
    };
  }
  const width = frame.height * ratio;
  return {
    left: frame.left + (frame.width - width) / 2,
    top: frame.top,
    width,
    height: frame.height,
  };
}

function textShapeInBox(slide, box, predicate = () => true) {
  return slide.shapes.items.find((shape) => {
    const text = String(shape.text ?? "");
    return text && centerInBox(shape.position ?? {}, box) && predicate(shape, text);
  });
}

function blankShapeInBox(slide, box) {
  return slide.shapes.items.find((shape) => {
    return !String(shape.text ?? "") && centerInBox(shape.position ?? {}, box);
  });
}

function moveShape(shape, position) {
  if (shape) {
    shape.position = position;
  }
}

function moveTextByValue(slide, value, position) {
  const shape = slide.shapes.items.find((item) => String(item.text ?? "") === value);
  moveShape(shape, position);
  return shape;
}

async function replaceImageInBox(slideNo, imagePath, box, frame = box, { alt = "对比场景截图" } = {}) {
  const slide = deck.slides.items[slideNo - 1];
  const image = firstImageInBox(slide, box);
  if (!image) {
    throw new Error(`Image not found on slide ${slideNo}`);
  }
  await image.replace({
    blob: await blobFor(imagePath),
    contentType: "image/png",
    alt,
    fit: "contain",
  });
  image.position = fitRatioInFrame(await imageRatioFor(imagePath), frame);
}

function clearTextInBox(slideNo, box) {
  for (const shape of textShapesOnSlide(slideNo)) {
    const p = shape.position ?? {};
    const cx = (p.left ?? 0) + (p.width ?? 0) / 2;
    const cy = (p.top ?? 0) + (p.height ?? 0) / 2;
    if (cx >= box.left && cx <= box.left + box.width && cy >= box.top && cy <= box.top + box.height) {
      shape.text = "";
    }
  }
}

async function addImageToSlide(slideNo, imagePath, frame) {
  const slide = deck.slides.items[slideNo - 1];
  slide.images.add({
    blob: await blobFor(imagePath),
    contentType: "image/png",
    alt: "对比场景截图",
    fit: "contain",
    position: fitRatioInFrame(await imageRatioFor(imagePath), frame),
  });
}

async function repairOutputScreenshots() {
  await replaceImageInBox(
    4,
    path.join(CASE_OUTPUT_CROP_DIR, "case08_output_screenshot.png"),
    { left: 410, top: 196, width: 370, height: 384 },
    { left: 410, top: 196, width: 370, height: 384 },
    { alt: "输出截图" },
  );
}

async function repairJudgeScreenshots() {
  await replaceImageInBox(
    4,
    path.join(CASE_JUDGE_CROP_DIR, "case08_judge_from_html.png"),
    { left: 806, top: 196, width: 390, height: 384 },
    { left: 806, top: 196, width: 390, height: 384 },
    { alt: "LLM-Judge 评分截图" },
  );
}

async function repairCompareScreenshots() {
  const compareCard = { left: 84, top: 378, width: 300, height: 202 };
  const compareInner = { left: 94, top: 388, width: 280, height: 182 };

  await replaceImageInBox(
    4,
    path.join(CASE_COMPARE_CROP_DIR, "case08_compare_screenshot.png"),
    compareCard,
    compareInner,
  );
  await replaceImageInBox(
    5,
    path.join(CASE_COMPARE_CROP_DIR, "case09_compare_screenshot.png"),
    compareCard,
    compareInner,
  );

  for (const slideNo of [8, 9]) {
    clearTextInBox(slideNo, compareCard);
  }
  await addImageToSlide(
    8,
    path.join(CASE_COMPARE_CROP_DIR, "case12_compare_screenshot.png"),
    compareInner,
  );
  await addImageToSlide(
    9,
    path.join(CASE_COMPARE_CROP_DIR, "case13_compare_screenshot.png"),
    compareInner,
  );
}

function applyCaseLayout(slideNo, { hasCompare }) {
  const slide = deck.slides.items[slideNo - 1];
  const oldInput = { left: 84, top: 196, width: hasCompare ? 300 : 270, height: 132 };
  const oldCompare = { left: 84, top: 378, width: 300, height: 202 };
  const oldOutput = { left: hasCompare ? 410 : 374, top: 196, width: hasCompare ? 370 : 400, height: 384 };
  const oldJudge = { left: hasCompare ? 806 : 794, top: 196, width: hasCompare ? 390 : 402, height: 384 };
  const oldConclusion = { left: hasCompare ? 806 : 794, top: 604, width: hasCompare ? 390 : 402, height: 64 };
  const oldConclusionBar = { left: hasCompare ? 807 : 795, top: 605, width: hasCompare ? 388 : 400, height: 4 };

  const layout = {
    inputLabel: { left: 76, top: 170, width: 208, height: 18 },
    inputCard: { left: 76, top: 196, width: 208, height: hasCompare ? 172 : 180 },
    inputText: { left: 86, top: 208, width: 188, height: hasCompare ? 148 : 146 },
    compareLabel: { left: 76, top: 378, width: 208, height: 18 },
    compareCard: { left: 76, top: 404, width: 208, height: 256 },
    compareImageFrame: { left: 78, top: 407, width: 204, height: 250 },
    outputLabel: { left: 292, top: 170, width: 560, height: 18 },
    outputCard: { left: 292, top: 196, width: 560, height: 464 },
    outputImageFrame: { left: 300, top: 204, width: 544, height: 448 },
    judgeLabel: { left: 864, top: 170, width: 376, height: 18 },
    judgeCard: { left: 864, top: 196, width: 376, height: 420 },
    judgeImageFrame: { left: 876, top: 206, width: 352, height: 400 },
    conclusionBox: { left: 864, top: 616, width: 376, height: 44 },
    conclusionBar: { left: 865, top: 617, width: 374, height: 4 },
    conclusionLabel: { left: 878, top: 630, width: 50, height: 18 },
    conclusionText: { left: 932, top: 623, width: 294, height: 34 },
  };

  moveTextByValue(slide, "输入", layout.inputLabel);
  moveShape(blankShapeInBox(slide, oldInput), layout.inputCard);
  moveShape(
    textShapeInBox(slide, oldInput, (_, text) => text !== "输入"),
    layout.inputText,
  );

  if (hasCompare) {
    moveTextByValue(slide, "对比场景", layout.compareLabel);
    moveShape(blankShapeInBox(slide, oldCompare), layout.compareCard);
    const compareImage = firstImageInBox(slide, oldCompare);
    if (compareImage) {
      compareImage.position = fitPosition(compareImage.position ?? layout.compareImageFrame, layout.compareImageFrame);
    }
  }

  moveTextByValue(slide, "输出", layout.outputLabel);
  moveShape(blankShapeInBox(slide, oldOutput), layout.outputCard);
  const outputImage = firstImageInBox(slide, oldOutput);
  if (outputImage) {
    outputImage.position = fitPosition(outputImage.position ?? layout.outputImageFrame, layout.outputImageFrame);
  }

  moveTextByValue(slide, "LLM-Judge", layout.judgeLabel);
  moveShape(blankShapeInBox(slide, oldJudge), layout.judgeCard);
  const judgeImage = firstImageInBox(slide, oldJudge);
  if (judgeImage) {
    judgeImage.position = fitPosition(judgeImage.position ?? layout.judgeImageFrame, layout.judgeImageFrame);
  }

  moveShape(blankShapeInBox(slide, oldConclusion), layout.conclusionBox);
  moveShape(blankShapeInBox(slide, oldConclusionBar), layout.conclusionBar);
  for (const shape of slide.shapes.items) {
    const p = shape.position ?? {};
    if (!String(shape.text ?? "") && (p.left ?? 0) < 900 && (p.top ?? 0) >= 600 && (p.top ?? 0) <= 610 && (p.height ?? 99) <= 8) {
      shape.position = layout.conclusionBar;
    }
  }
  const conclusionLabel = moveTextByValue(slide, "验证点", layout.conclusionLabel)
    ?? moveTextByValue(slide, "评价", layout.conclusionLabel);
  const conclusionText = textShapeInBox(slide, oldConclusion, (_, text) => text !== "验证点" && text !== "评价");
  moveShape(conclusionText, layout.conclusionText);
  if (slideNo === 4) {
    if (conclusionLabel) {
      conclusionLabel.text.style = {
        ...conclusionLabel.text.style,
        fontSize: 14,
        wrap: "square",
        insets: { left: 0, right: 0, top: 0, bottom: 0 },
      };
    }
    if (conclusionText) {
      conclusionText.text.style = {
        ...conclusionText.text.style,
        fontSize: 13,
        wrap: "square",
        insets: { left: 0, right: 0, top: 0, bottom: 0 },
      };
    }
  }
}

function applyCaseLayouts() {
  for (const slideNo of [4, 5, 8, 9]) {
    applyCaseLayout(slideNo, { hasCompare: true });
  }
  for (const slideNo of [6, 7]) {
    applyCaseLayout(slideNo, { hasCompare: false });
  }
}

await replaceExactText("能力差异点 | Demo Case | 质量验证", "产出沉淀 | Demo Case | 评估闭环", {
  slide: 1,
});

await replaceExactText("工作产出与案例 | 五个差异点", "工作产出与案例 | 五类可复用产出", {
  slide: 2,
});
await replaceExactText("异构 Item 统一表征", "异构 Item 统一表征", { slide: 2 });
await replaceExactText(
  "题目、试卷、视频、小讲堂进入同一词表空间",
  "统一题目、试卷、视频、小讲堂的 SID 与语义空间",
  { slide: 2 },
);
await replaceExactText("通用能力保持", "训练链路抗遗忘", { slide: 2 });
await replaceExactText(
  "两阶段预训练 + SFT 通用数据混合",
  "两阶段 CPT + SFT 混合通用数据，保留通用能力与 SID 对齐",
  { slide: 2 },
);
await replaceExactText("多源协同数据挖掘", "冷启动监督构造", { slide: 2 });
await replaceExactText(
  "共现、语义近邻、教师推理链共同补足冷启动监督",
  "共现、语义近邻、教师推理链共同生成可训练样本",
  { slide: 2 },
);
await replaceExactText("约束解码优化", "任务级约束解码", { slide: 2 });
await replaceExactText(
  "按任务裁剪 SID 空间，保证合法且减少重复",
  "按题目、搜索、异构场景裁剪 SID，减少非法与重复输出",
  { slide: 2 },
);
await replaceExactText(
  "覆盖语义 ID、通用能力、物品理解和推荐效果",
  "覆盖 SID 合法性、通用能力、Item 理解与推荐质量",
  { slide: 2 },
);
addSlideNote(
  deck.slides.items[1],
  "核心产出：把教育 OneRec 从模型能力验证推进到可训练、可约束、可评估的链路资产。",
);

await replaceExactText(
  "工作产出与案例 | 覆盖三类核心能力",
  "工作产出与案例 | 三类场景完成可视化验证",
  { slide: 3 },
);
await replaceExactText("题目推荐能力", "题目相似推荐", { slide: 3 });
await replaceExactText(
  "同知识点、同解题模型的举一反三",
  "同知识点、同解题模型迁移推荐",
  { slide: 3 },
);
await replaceRepeatedTextOnSlide(
  "case 1 / case 2",
  ["2 个 case：命中 / 边界", "2 个 case：题目 -> 多形态资源", "2 个 case：应用题 / 试卷"],
  { slide: 3 },
);
await replaceExactText(
  "围绕同主题跨题目、视频、小讲堂推荐",
  "围绕同主题跨题目、视频、小讲堂组织资源",
  { slide: 3 },
);
await replaceExactText("从自然语言需求命中教育资源", "从自然语言需求命中题目与试卷", {
  slide: 3,
});
await replaceExactText(
  "每个 case 保留输入、模型输出、LLM-Judge 和对比场景，证明不是只看离线指标。",
  "验证方式：每个 case 同时保留输入、生成输出、LLM-Judge 与 Agent/规则对比，支撑能力与边界判断。",
  { slide: 3 },
);

await replaceExactText("工作产出与案例 | 题目推荐能力 case 1", "工作产出与案例 | 题目推荐 Case 1", {
  slide: 4,
});
await replaceExactText(
  "质量守恒定律：推荐同知识点、同判据题目",
  "性质决定用途：推荐同判据生活应用题",
  { slide: 4 },
);
await replaceExactText("case 结论", "评价", { slide: 4 });
await replaceExactText(
  "推荐结果能围绕守恒定律给出迁移理由，并通过 Judge 验证关联质量。",
  "模型能围绕物质性质与用途给出迁移理由；对比场景仅用向量召回，结果同质化严重。",
  { slide: 4 },
);

await replaceExactText("工作产出与案例 | 题目推荐能力 case 2", "工作产出与案例 | 题目推荐 Case 2", {
  slide: 5,
});
await replaceExactText("古诗意象判断：对比场景暴露无关科目问题", "生物判断题：对比暴露类型与学科约束边界", {
  slide: 5,
});
await replaceExactText("case 结论", "验证点", { slide: 5 });
await replaceExactText(
  "模型能输出题目推荐与理由，对比场景体现需要更强类型与学科约束。",
  "模型能生成题目推荐和理由，同时暴露题型、学科与资源类型约束仍需加强。",
  { slide: 5 },
);

await replaceExactText(
  "工作产出与案例 | 异构类型推荐 case 1",
  "工作产出与案例 | 异构推荐 Case 1",
  { slide: 6 },
);
await replaceExactText("case 结论", "验证点", { slide: 6 });
await replaceExactText(
  "异构 Item 统一表征后，可以从锚点题目扩展到多形态教育资源。",
  "统一表征后，模型可从题目锚点扩展到视频、小讲堂等多形态资源。",
  { slide: 6 },
);

await replaceExactText(
  "工作产出与案例 | 异构类型推荐 case 2",
  "工作产出与案例 | 异构推荐 Case 2",
  { slide: 7 },
);
await replaceExactText("case 结论", "验证点", { slide: 7 });
await replaceExactText(
  "模型不只召回题目，也能组织视频、小讲堂等延伸学习内容。",
  "验证同一主题下的跨类型补充学习，不局限于题目召回。",
  { slide: 7 },
);

await replaceExactText("工作产出与案例 | 搜索能力 case 1", "工作产出与案例 | 搜索能力 Case 1", {
  slide: 8,
});
await replaceExactText("自然语言需求到教育资源命中", "自然语言需求命中应用题资源", {
  slide: 8,
});
await replaceExactText("case 结论", "验证点", { slide: 8 });
await replaceExactText(
  "搜索 case 验证模型在资源理解和结果解释上的端到端能力。",
  "自然语言查询能命中可学习资源，并给出可解释推荐理由。",
  { slide: 8 },
);

await replaceExactText("工作产出与案例 | 搜索能力 case 2", "工作产出与案例 | 搜索能力 Case 2", {
  slide: 9,
});
await replaceExactText("自然语言需求到教育资源命中", "自然语言需求命中试卷资源", {
  slide: 9,
});
await replaceExactText("case 结论", "验证点", { slide: 9 });
await replaceExactText(
  "与 Agent 搜题链路相比，生成式路线更适合沉淀为低延迟服务。",
  "同一查询可返回试卷类资源，搜索能力可沉淀为低延迟服务。",
  { slide: 9 },
);

await repairOutputScreenshots();
await repairJudgeScreenshots();
await repairCompareScreenshots();
applyCaseLayouts();

await saveSectionDeck("03", deck);
