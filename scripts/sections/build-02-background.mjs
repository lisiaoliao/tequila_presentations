import { buildSectionDeck, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("02");

// Section-specific edits for 02 背景与目标 go here.
// This section owns: divider 02, optimization background, goal/challenge slides.
function replaceTextOnSlide(slideNo, search, replacement) {
  const slide = deck.slides.items[slideNo - 1];
  const target = slide.shapes.items.find((shape) => String(shape.text ?? "") === search);
  if (!target) {
    throw new Error(`Could not find exact textbox text on slide ${slideNo}: ${search}`);
  }
  target.text = replacement;
}

function approxEqual(a, b) {
  return Math.abs(a - b) < 1;
}

function findByPosition(items, position) {
  return items.find((item) => {
    const itemPosition = item.position ?? item.frame;
    return (
      itemPosition &&
      approxEqual(itemPosition.left, position.left) &&
      approxEqual(itemPosition.top, position.top) &&
      approxEqual(itemPosition.width, position.width) &&
      approxEqual(itemPosition.height, position.height)
    );
  });
}

function tuneOneRecReferenceVisual() {
  const slide = deck.slides.items[1];
  const referenceFrame = findByPosition(slide.shapes.items, { left: 818, top: 196, width: 354, height: 384 });
  const oneRecImage = findByPosition(slide.images.items, { left: 842, top: 263.62, width: 306, height: 212.75 });
  const caption = slide.shapes.items.find(
    (shape) => String(shape.text ?? "") === "OneRec 参照：显式推理、时延优化、评估闭环",
  );

  if (!referenceFrame || !oneRecImage || !caption) {
    throw new Error("Could not find OneRec reference visual elements on section 02 slide 2.");
  }

  referenceFrame.fill = "none";
  referenceFrame.line = { style: "solid", fill: "none", width: 0 };
  oneRecImage.position = { left: 792, top: 214, width: 395, height: 275 };
  caption.position = { left: 792, top: 518, width: 395, height: 46 };
  caption.text = "OneRec\n参照：显式推理、时延优化、评估闭环";
  caption.text.style = {
    ...caption.text.style,
    alignment: "center",
  };
}

function tuneRouteSummary() {
  const slide = deck.slides.items[1];
  const [agentCard, recCard, thirdRouteCard] = [
    { left: 84, top: 282, width: 320, height: 128 },
    { left: 430, top: 282, width: 320, height: 128 },
    { left: 146, top: 500, width: 604, height: 116 },
  ].map((position) => findByPosition(slide.shapes.items, position));

  const routeShapes = {
    subtitle: slide.shapes.items.find(
      (shape) => String(shape.text ?? "") === "推荐/搜索成为核心交互，需要补齐两类路线的短板",
    ),
    intro: slide.shapes.items.find(
      (shape) => String(shape.text ?? "") === "现有两条技术路线各有优势，但都难以同时满足业务要求：",
    ),
    agentTitle: slide.shapes.items.find((shape) => String(shape.text ?? "") === "路线一：Agent 编排检索"),
    agentBody: slide.shapes.items.find(
      (shape) => String(shape.text ?? "") === "• 决策显式，可解释性强\n• 多轮调用，秒级/十秒级时延",
    ),
    recTitle: slide.shapes.items.find((shape) => String(shape.text ?? "") === "路线二：判别式推荐系统"),
    recBody: slide.shapes.items.find(
      (shape) => String(shape.text ?? "") === "• 数十毫秒响应，时效性优秀\n• 黑盒打分，缺少可审查解释",
    ),
    arrow: slide.shapes.items.find((shape) => String(shape.text ?? "") === "↓"),
    thirdTitle: slide.shapes.items.find((shape) => String(shape.text ?? "") === "第三条路线：OneRec 生成式推荐"),
    thirdBody: slide.shapes.items.find(
      (shape) =>
        String(shape.text ?? "") ===
        "在线时延约束下，提供具备一定忠实性的推荐解释\n参照 OneRec-Think / OneReason，将推理与推荐统一到单一模型",
    ),
  };

  if (
    !agentCard ||
    !recCard ||
    !thirdRouteCard ||
    Object.values(routeShapes).some((shape) => !shape)
  ) {
    throw new Error("Could not find route summary elements on section 02 slide 2.");
  }

  routeShapes.subtitle.text = "教育推荐/搜索需求占比持续上升，现有路线难以兼顾时效性与可解释性";
  routeShapes.subtitle.position = { left: 106, top: 188, width: 650, height: 24 };
  routeShapes.intro.text =
    "核心矛盾：Agent 解释强但慢，判别式推荐快但黑盒";
  routeShapes.intro.position = { left: 84, top: 238, width: 690, height: 28 };

  agentCard.position = { left: 84, top: 294, width: 326, height: 142 };
  recCard.position = { left: 424, top: 294, width: 326, height: 142 };
  for (const card of [agentCard, recCard]) {
    card.fill = "#F7F5FF";
    card.line = { style: "solid", fill: "#C8C1FF", width: 1.3 };
    card.shadow = "shadow-sm";
  }

  routeShapes.agentTitle.position = { left: 112, top: 318, width: 270, height: 24 };
  routeShapes.agentBody.position = { left: 112, top: 352, width: 270, height: 64 };
  routeShapes.agentBody.text = "• 中间决策显式，可解释性强\n• 多轮模型调用与串行工具链\n• 分钟级时延，成本随复杂度增长";

  routeShapes.recTitle.position = { left: 452, top: 318, width: 270, height: 24 };
  routeShapes.recBody.position = { left: 452, top: 352, width: 270, height: 64 };
  routeShapes.recBody.text = "• 毫秒级响应，适合高频交互\n• 偏好隐含在参数与 embedding 中\n• 难输出可审查的推荐依据";

  routeShapes.arrow.position = { left: 380, top: 434, width: 74, height: 48 };

  thirdRouteCard.position = { left: 84, top: 496, width: 666, height: 126 };
  thirdRouteCard.fill = "#F0EDFF";
  thirdRouteCard.line = { style: "solid", fill: "#635BFF", width: 1.5 };
  thirdRouteCard.shadow = "shadow-md";

  routeShapes.thirdTitle.position = { left: 124, top: 516, width: 590, height: 26 };
  routeShapes.thirdTitle.text = "第三条路线：OneRec 生成式推荐";
  routeShapes.thirdTitle.text.style = {
    ...routeShapes.thirdTitle.text.style,
    color: "#332A86",
    bold: true,
  };

  routeShapes.thirdBody.position = { left: 124, top: 552, width: 584, height: 54 };
  routeShapes.thirdBody.text =
    "在在线时延约束下保留推荐解释：借鉴 OneRec-Think / OneReason 的显式推理与快慢思考架构，\n将对话、推理、推荐统一到单一模型，同时服务精度、可解释性与工程落地。";
  routeShapes.thirdBody.text.style = {
    ...routeShapes.thirdBody.text.style,
    color: "#2F3556",
    fontSize: 15,
  };
}

function addTextbox(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: style.fontSize ?? 18,
    bold: style.bold ?? false,
    color: style.color ?? "#15192F",
    typeface: style.typeface ?? "PingFang SC",
    alignment: style.alignment,
    wrap: "square",
    insets: style.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return shape;
}

function tuneGoalAndChallenges() {
  const slide = deck.slides.items[2];
  const goalTitle = slide.shapes.items.find((shape) => String(shape.text ?? "") === "目标：产出教育领域的基座推荐模型");
  const goalBody = slide.shapes.items.find(
    (shape) =>
      String(shape.text ?? "") ===
      "以通用 LLM 为底座，在不损失通用对话与推理能力的前提下，注入 Item 语义理解与生成式推荐能力。",
  );
  const coreJudgment = slide.shapes.items.find(
    (shape) =>
      String(shape.text ?? "") ===
      "核心判断：目标不是单点推荐模型，而是面向推荐、搜索、题目理解的统一能力底座。",
  );

  const cardPositions = [
    { left: 100, top: 268, width: 500, height: 98 },
    { left: 656, top: 268, width: 500, height: 98 },
    { left: 100, top: 406, width: 500, height: 98 },
    { left: 656, top: 406, width: 500, height: 98 },
  ];
  const cards = cardPositions.map((position) => findByPosition(slide.shapes.items, position));
  const topBars = [
    { left: 101, top: 269, width: 498, height: 4 },
    { left: 657, top: 269, width: 498, height: 4 },
    { left: 101, top: 407, width: 498, height: 4 },
    { left: 657, top: 407, width: 498, height: 4 },
  ].map((position) => findByPosition(slide.shapes.items, position));
  const circles = [
    { left: 122, top: 290, width: 44, height: 44 },
    { left: 678, top: 290, width: 44, height: 44 },
    { left: 122, top: 428, width: 44, height: 44 },
    { left: 678, top: 428, width: 44, height: 44 },
  ].map((position) => findByPosition(slide.shapes.items, position));
  const numbers = ["1", "2", "3", "4"].map((value) =>
    slide.shapes.items.find((shape) => String(shape.text ?? "") === value && (shape.position?.top ?? 0) > 250),
  );
  const titles = [
    "模型侧：能力注入与遗忘控制",
    "应用侧：多任务互扰与部署隔离",
    "业务侧：无反馈条件下的监督与度量",
    "工程侧：推理成本与增量更新",
  ].map((value) => slide.shapes.items.find((shape) => String(shape.text ?? "") === value));
  const bodies = [
    "保持通用能力，并抑制 text <-> SID 跨训练阶段遗忘",
    "训练抑制负迁移，推理防止串扰，上线要有回归与兜底",
    "冷启动缺少真实行为反馈，需要代理监督与评估体系",
    "在时延 SLA 下重设计推理，并支撑 SID 与候选池增量更新",
  ].map((value) => slide.shapes.items.find((shape) => String(shape.text ?? "") === value));

  if (
    !goalTitle ||
    !goalBody ||
    !coreJudgment ||
    [...cards, ...topBars, ...circles, ...numbers, ...titles, ...bodies].some((shape) => !shape)
  ) {
    throw new Error("Could not find goal and challenge elements on section 02 slide 3.");
  }

  goalTitle.text = "总体目标：产出教育领域的基座推荐模型";
  goalTitle.position = { left: 84, top: 146, width: 880, height: 34 };

  goalBody.text =
    "以通用 LLM 为底座，在不损失通用对话与推理能力的前提下，注入教育 Item 语义理解与生成式推荐能力；\n形成“一个模型、多种场景”的统一能力底座，通过指令适配推荐、搜索、题目理解辅助等下游业务。";
  goalBody.position = { left: 84, top: 190, width: 1040, height: 48 };
  goalBody.text.style = {
    ...goalBody.text.style,
    fontSize: 17,
    color: "#364157",
  };

  addTextbox(slide, "问题与挑战", { left: 84, top: 284, width: 240, height: 28 }, {
    fontSize: 22,
    bold: true,
    color: "#15192F",
  });

  const nextCardPositions = [
    { left: 100, top: 326, width: 500, height: 120 },
    { left: 656, top: 326, width: 500, height: 120 },
    { left: 100, top: 478, width: 500, height: 120 },
    { left: 656, top: 478, width: 500, height: 120 },
  ];
  const nextTopBars = [
    { left: 101, top: 327, width: 498, height: 4 },
    { left: 657, top: 327, width: 498, height: 4 },
    { left: 101, top: 479, width: 498, height: 4 },
    { left: 657, top: 479, width: 498, height: 4 },
  ];
  const nextCircles = [
    { left: 122, top: 352, width: 44, height: 44 },
    { left: 678, top: 352, width: 44, height: 44 },
    { left: 122, top: 504, width: 44, height: 44 },
    { left: 678, top: 504, width: 44, height: 44 },
  ];
  const nextNumberPositions = [
    { left: 122, top: 362, width: 44, height: 22 },
    { left: 678, top: 362, width: 44, height: 22 },
    { left: 122, top: 514, width: 44, height: 22 },
    { left: 678, top: 514, width: 44, height: 22 },
  ];
  const nextTitlePositions = [
    { left: 184, top: 348, width: 380, height: 24 },
    { left: 740, top: 348, width: 380, height: 24 },
    { left: 184, top: 500, width: 380, height: 24 },
    { left: 740, top: 500, width: 380, height: 24 },
  ];
  const nextBodyPositions = [
    { left: 184, top: 382, width: 370, height: 46 },
    { left: 740, top: 382, width: 370, height: 46 },
    { left: 184, top: 534, width: 370, height: 46 },
    { left: 740, top: 534, width: 370, height: 46 },
  ];
  const nextTitles = [
    "模型侧｜能力注入与遗忘控制",
    "应用侧｜多任务互扰与部署隔离",
    "业务侧｜无反馈条件下的监督与度量",
    "工程侧｜推理成本与增量更新",
  ];
  const nextBodies = [
    "能力注入不能牺牲通用能力；同时要抑制 text <-> SID\n对齐在 CPT -> SFT -> 增量训练中的遗忘。",
    "单一模型承载异构任务时，要降低训练负迁移，\n推理防串扰，上线配套回归、路由与兜底。",
    "冷启动缺少真实行为反馈，需要构建可靠监督信号，\n并用代理评估论证与业务价值的一致性。",
    "显式 CoT 成本高，需在 SLA 下重设计推理架构，\n并打通 SID、约束解码、候选池的增量更新。",
  ];

  for (const [index, card] of cards.entries()) {
    card.position = nextCardPositions[index];
    card.shadow = "shadow-sm";
    topBars[index].position = nextTopBars[index];
    circles[index].position = nextCircles[index];
    numbers[index].position = nextNumberPositions[index];
    titles[index].position = nextTitlePositions[index];
    titles[index].text = nextTitles[index];
    titles[index].text.style = {
      ...titles[index].text.style,
      fontSize: 18,
      bold: true,
    };
    bodies[index].position = nextBodyPositions[index];
    bodies[index].text = nextBodies[index];
    bodies[index].text.style = {
      ...bodies[index].text.style,
      fontSize: 14,
      color: "#4A5368",
    };
  }

  coreJudgment.text = "";
}

const sourceAlignedEdits = [
  [1, "优化背景 | 问题与挑战 | 优化方案", "优化背景 | 总体目标 | 问题与挑战"],
  [2, "业务需要探索第三条技术路线", "推荐/搜索成为核心交互，需要补齐两类路线的短板"],
  [2, "背景与目标 | 为什么需要第三条路线", "背景与目标 | 为什么需要 OneRec"],
  [2, "现有两条技术路线的结构性短板：", "现有两条技术路线各有优势，但都难以同时满足业务要求："],
  [
    2,
    "• 解释强、检索精度高\n• 多轮模型调用，端到端时延秒级/十秒级",
    "• 决策显式，可解释性强\n• 多轮调用，秒级/十秒级时延",
  ],
  [2, "路线二：传统判别推荐", "路线二：判别式推荐系统"],
  [
    2,
    "• 数十毫秒响应，时效性优秀\n• 黑盒系统，缺乏推荐解释",
    "• 数十毫秒响应，时效性优秀\n• 黑盒打分，缺少可审查解释",
  ],
  [
    2,
    "在满足在线时延约束的前提下，提供具备一定忠实性的推荐解释\n将对话、推理与生成式推荐统一于单一模型，同时提升推荐精度与可解释性",
    "在线时延约束下，提供具备一定忠实性的推荐解释\n参照 OneRec-Think / OneReason，将推理与推荐统一到单一模型",
  ],
  [2, "OneRec 研究路线：预训练、后训练、评估闭环", "OneRec 参照：显式推理、时延优化、评估闭环"],
  [3, "背景与目标 | 一个模型，多种教育场景", "背景与目标 | 教育 OneRec 基座模型"],
  [
    3,
    "以通用 LLM 为底座，注入 Item 语义理解与生成式推荐能力，通过指令适配推荐、搜索和题目理解。",
    "以通用 LLM 为底座，在不损失通用对话与推理能力的前提下，注入 Item 语义理解与生成式推荐能力。",
  ],
  [3, "灾难性遗忘", "模型侧：能力注入与遗忘控制"],
  [3, "学会推荐的同时，不丢通用能力和 SID 对齐", "保持通用能力，并抑制 text <-> SID 跨训练阶段遗忘"],
  [3, "任务互扰与隔离", "应用侧：多任务互扰与部署隔离"],
  [3, "一个模型干多种活，训练和上线都要互不牵连", "训练抑制负迁移，推理防止串扰，上线要有回归与兜底"],
  [3, "推荐质量度量", "业务侧：无反馈条件下的监督与度量"],
  [3, "冷启动缺少真实反馈，必须构造可靠监督与评估", "冷启动缺少真实行为反馈，需要代理监督与评估体系"],
  [3, "工程落地", "工程侧：推理成本与增量更新"],
  [3, "显式 CoT 慢且贵，新内容还要持续入库", "在时延 SLA 下重设计推理，并支撑 SID 与候选池增量更新"],
  [
    3,
    "核心判断：不是先做一个推荐模型，而是先搭出可训练、可约束、可评估的生产链路。",
    "核心判断：目标不是单点推荐模型，而是面向推荐、搜索、题目理解的统一能力底座。",
  ],
];

for (const [slideNo, search, replacement] of sourceAlignedEdits) {
  replaceTextOnSlide(slideNo, search, replacement);
}

tuneOneRecReferenceVisual();
tuneRouteSummary();
tuneGoalAndChallenges();

await saveSectionDeck("02", deck);
