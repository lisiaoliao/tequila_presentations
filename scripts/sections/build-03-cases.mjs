import { buildSectionDeck, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("03");

// Section-specific edits for 03 工作产出与案例 go here.
// This section owns: divider 03, capability summary, demo overview, six case slides.

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
await replaceExactText("case 结论", "验证点", { slide: 4 });
await replaceExactText(
  "推荐结果能围绕守恒定律给出迁移理由，并通过 Judge 验证关联质量。",
  "模型能围绕同一知识点给出迁移理由，Judge 结果支持推荐相关性。",
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

await saveSectionDeck("03", deck);
