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

const sourceAlignedEdits = [
  [1, "优化背景 | 问题与挑战 | 优化方案", "优化背景 | 总体目标 | 问题与挑战"],
  [2, "业务需要探索第三条技术路线", "推荐/搜索成为核心交互，需要补齐两类路线的短板"],
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

await saveSectionDeck("02", deck);
