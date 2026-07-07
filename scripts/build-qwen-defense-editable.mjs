import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_DIR = path.join(ROOT, "assets");
const PREVIEW_DIR = path.join(ROOT, "preview");
const OUTPUT_DIR = process.env.PPTX_OUTPUT_DIR
  ? path.resolve(process.env.PPTX_OUTPUT_DIR)
  : path.join(ROOT, "output");
const IMG_DIR = path.join(ASSET_DIR, "md_images");
const CASE_COMPARE_CROP_DIR = path.join(ASSET_DIR, "case_compare_crops");
const OUT = process.env.PPTX_OUT
  ? path.resolve(process.env.PPTX_OUT)
  : path.join(OUTPUT_DIR, "转正答辩_千问模板.pptx");
const LOGO_PATH = path.join(ASSET_DIR, "qwen", "qwen-logo.png");
const BG_PATH = path.join(ASSET_DIR, "qwen", "qwen-background.png");
const RUC_LOGO_PATH = path.join(ASSET_DIR, "brand", "ruc-seal.png");
const TENCENT_ADS_LOGO_PATH = path.join(ASSET_DIR, "brand", "tencent-ads-logo.png");

const C = {
  qwen: "#635BFF",
  qwen2: "#7C3AED",
  blue: "#00A8FF",
  navy: "#14113D",
  ink: "#111827",
  body: "#344054",
  muted: "#667085",
  line: "#D8DDF4",
  pale: "#F6F7FF",
  pale2: "#EFF6FF",
  white: "#FFFFFF",
  green: "#16A34A",
  red: "#EF4444",
  orange: "#F59E0B",
};

const FONT = "PingFang SC";
let logoBytes;
let bgBytes;
let rucLogoBytes;
let tencentAdsLogoBytes;
const imageCache = new Map();

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function blobFor(file) {
  if (!imageCache.has(file)) {
    imageCache.set(file, await readImageBlob(file));
  }
  return imageCache.get(file);
}

function img(n) {
  const matches = {
    1: "img01_udede3eda.png",
    2: "img02_ufe20a803.png",
    3: "img03_g7114.png",
    4: "img04_UUVEJ.png",
    5: "img05_BcJMb.png",
    6: "img06_u02d0a2f0.png",
    7: "img07_uff780870.png",
    8: "img08_ub6ca5391.png",
    9: "img09_u75cca43d.png",
    10: "img10_u16860143.png",
    11: "img11_u34b9fe8e.png",
    12: "img12_u3394fbd1.png",
    13: "img13_ucf7f8160.png",
    14: "img14_u61fe3ac7.png",
    15: "img15_XfUbR.png",
    16: "img16_u469b9f1f.png",
    17: "img17_u6080289d.png",
    18: "img18_uf5f329a8.png",
    19: "img19_ud464217e.png",
    20: "img20_WwCrW.png",
    21: "img21_ubd5afa91.png",
    22: "img22_ua857d9e7.png",
    23: "img23_ub458012f.png",
    24: "img24_uda6413b8.png",
    25: "img25_u6f2d4263.png",
    26: "img26_u52992afe.png",
    27: "img27_u6d88a716.png",
    28: "img28_uda60eabf.png",
    29: "img29_dDzA2.png",
    30: "img30_u556c9990.png",
    31: "img31_u274a1e51.png",
    32: "img32_u9fe477fe.png",
    33: "img33_dD5Kx.png",
    34: "img34_u365ab4d6.png",
    35: "img35_XruRi.png",
    36: "img36_u51a9ff4d.png",
    37: "img37_u0b327924.png",
    38: "img38_tuAs7.png",
  };
  return `${IMG_DIR}/${matches[n]}`;
}

function imagePath(ref) {
  return typeof ref === "number" ? img(ref) : ref;
}

async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function shape(slide, geometry, position, opts = {}) {
  const config = {
    geometry,
    position,
    fill: opts.fill ?? C.white,
    line: opts.line ?? { style: "solid", fill: opts.stroke ?? C.line, width: opts.width ?? 1 },
    shadow: opts.shadow ?? "shadow-none",
  };
  if (["rect", "textbox", "roundRect"].includes(geometry) && opts.radius !== undefined) {
    config.borderRadius = opts.radius;
  }
  return slide.shapes.add(config);
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
    color: opts.color ?? C.ink,
    typeface: opts.font ?? FONT,
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
    geometry: opts.geometry,
    borderRadius: opts.radius,
  });
}

function brand(slide, dark = false) {
  image(slide, logoBytes, { left: 1042, top: 32, width: 34, height: 34 }, "Qwen logo");
  text(slide, "Qwen", { left: 1086, top: 35, width: 72, height: 20 }, {
    size: 16,
    bold: true,
    color: dark ? C.white : C.navy,
  });
  text(slide, "千问", { left: 1086, top: 56, width: 72, height: 16 }, {
    size: 11,
    color: dark ? "#E8ECFF" : C.muted,
  });
}

function pageChrome(slide, sec, title, topic, page) {
  slide.background.fill = C.white;
  brand(slide);
  shape(slide, "ellipse", { left: 50, top: 32, width: 64, height: 64 }, {
    fill: C.white,
    line: { style: "solid", fill: C.qwen, width: 2 },
    shadow: "shadow-sm",
  });
  text(slide, sec, { left: 50, top: 43, width: 64, height: 34 }, {
    size: 32,
    bold: true,
    color: C.qwen,
    align: "center",
  });
  const heading = topic ? `${title} | ${topic}` : title;
  const width = topic ? 690 : 494;
  const size = heading.length > 22 ? 21 : topic ? 24 : 26;
  shape(slide, "rect", { left: 104, top: 42, width, height: 44 }, { fill: C.qwen, line: noLine() });
  text(slide, heading, { left: 132, top: 49, width: width - 56, height: 28 }, {
    size,
    bold: true,
    color: C.white,
    align: "center",
  });
  shape(slide, "rect", { left: 52, top: 112, width: 1160, height: 3 }, { fill: C.qwen, line: noLine() });
  text(slide, page, { left: 1168, top: 684, width: 42, height: 16 }, { size: 11, color: "#98A2B3", align: "right" });
}

function card(slide, x, y, w, h, opts = {}) {
  return shape(slide, "roundRect", { left: x, top: y, width: w, height: h }, {
    fill: opts.fill ?? "#FCFDFF",
    line: { style: "solid", fill: opts.stroke ?? "#CFE4FF", width: opts.width ?? 1.1 },
    radius: opts.radius ?? 8,
    shadow: opts.shadow ?? "shadow-sm",
  });
}

function bullets(slide, items, pos, opts = {}) {
  text(slide, items.map((item) => `• ${item}`).join("\n"), pos, {
    size: opts.size ?? 16,
    color: opts.color ?? C.body,
  });
}

function callout(slide, label, body, x, y, w, h, color = C.qwen) {
  card(slide, x, y, w, h, { fill: "#F8FBFF", stroke: "#C7E7FF" });
  text(slide, label, { left: x + 22, top: y + 18, width: w - 44, height: 26 }, {
    size: 21,
    bold: true,
    color,
  });
  text(slide, body, { left: x + 22, top: y + 58, width: w - 44, height: h - 70 }, {
    size: 15,
    color: C.body,
  });
}

function sectionSlide(p, sec, title, subtitle, page) {
  const slide = p.slides.add();
  slide.background.fill = C.navy;
  image(slide, bgBytes, { left: 0, top: 0, width: W, height: H }, "Qwen background", { fit: "cover" });
  shape(slide, "rect", { left: 0, top: 0, width: W, height: H }, { fill: "#14113DCC", line: noLine() });
  shape(slide, "rect", { left: 870, top: 0, width: 410, height: H }, { fill: C.qwen, line: noLine() });
  brand(slide, true);
  text(slide, sec, { left: 88, top: 268, width: 90, height: 38 }, { size: 34, bold: true, color: "#D9D7FF" });
  text(slide, title, { left: 88, top: 322, width: 560, height: 52 }, { size: 31, bold: true, color: C.white });
  text(slide, subtitle, { left: 88, top: 392, width: 520, height: 28 }, { size: 14, color: "#E8ECFF" });
  shape(slide, "rect", { left: 88, top: 438, width: 70, height: 4 }, { fill: C.blue, line: noLine() });
  text(slide, page, { left: 88, top: 648, width: 220, height: 16 }, { size: 10, color: "#E8ECFF" });
}

function titleSlide(p) {
  const slide = p.slides.add();
  slide.background.fill = C.white;
  shape(slide, "rect", { left: 900, top: 0, width: 380, height: H }, { fill: C.qwen, line: noLine() });
  shape(slide, "ellipse", { left: 952, top: 92, width: 120, height: 120 }, { fill: "#8079FF", line: noLine() });
  shape(slide, "ellipse", { left: 1035, top: 240, width: 42, height: 42 }, { fill: C.blue, line: noLine() });
  image(slide, logoBytes, { left: 78, top: 58, width: 44, height: 44 }, "Qwen logo");
  text(slide, "Qwen 千问", { left: 134, top: 62, width: 160, height: 26 }, { size: 17, bold: true, color: C.navy });
  text(slide, "试用期转正答辩", { left: 96, top: 260, width: 600, height: 56 }, { size: 42, bold: true, color: C.ink });
  text(slide, "教育 OneRec 探索", { left: 96, top: 328, width: 360, height: 28 }, { size: 20, bold: true, color: C.qwen });
  shape(slide, "rect", { left: 96, top: 374, width: 420, height: 3 }, { fill: C.qwen, line: noLine() });
  text(slide, "李思奥（龙舌兰）", { left: 96, top: 444, width: 360, height: 24 }, { size: 17, bold: true, color: C.ink });
  text(slide, "2026.04.13 - 2026.07.12", { left: 96, top: 478, width: 320, height: 20 }, { size: 14, color: C.muted });
  text(slide, "从教育资源理解到可约束、可评估的生成式推荐链路", { left: 96, top: 536, width: 620, height: 28 }, {
    size: 18,
    color: C.body,
  });
  text(slide, "Qwen | 学习创新", { left: 912, top: 644, width: 150, height: 18 }, { size: 12, color: C.white });
}

function introSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "1", "个人介绍", "试用期主线", "03");
  text(slide, "李思奥（龙舌兰）", { left: 88, top: 152, width: 390, height: 46 }, { size: 36, bold: true, color: C.qwen });
  shape(slide, "rect", { left: 92, top: 216, width: 150, height: 4 }, { fill: C.qwen, line: noLine() });
  text(slide, "统计建模 · 推荐广告链路 · 生成式推荐探索", { left: 88, top: 240, width: 360, height: 24 }, { size: 17, bold: true, color: C.navy });
  const tags = ["统计背景", "广告推荐", "OneRec"];
  tags.forEach((tag, i) => {
    const x = 88 + i * 116;
    shape(slide, "roundRect", { left: x, top: 294, width: 96, height: 32 }, { fill: i === 2 ? "#F4F1FF" : "#F8FBFF", line: { style: "solid", fill: "#C7E7FF", width: 1 }, radius: 6, shadow: "shadow-none" });
    text(slide, tag, { left: x, top: 302, width: 96, height: 16 }, { size: 12, bold: true, color: i === 2 ? C.qwen : C.body, align: "center" });
  });
  shape(slide, "rect", { left: 558, top: 150, width: 2, height: 430 }, { fill: "#B9C2E8", line: noLine() });
  const events = [
    ["ruc", "2018.09 - 2024.06", "中国人民大学统计学院（本硕）"],
    ["tencent", "2024.07 - 2025.03", "流量支持中心\n广告业务问题全链路策略优化"],
    ["tencent", "2025.04 - 2026.03", "AI 推荐中心\n生成式推荐与大模型广告落地"],
    ["qwen", "2026.04 - 至今", "学习创新\n教育 OneRec 探索"],
  ];
  events.forEach((e, i) => {
    const y = 164 + i * 102;
    if (e[0] === "ruc") {
      image(slide, rucLogoBytes, { left: 452, top: y - 7, width: 50, height: 50 }, "中国人民大学校徽");
    } else if (e[0] === "tencent") {
      image(slide, tencentAdsLogoBytes, { left: 424, top: y + 4, width: 116, height: 22 }, "腾讯广告 logo");
    } else {
      image(slide, logoBytes, { left: 430, top: y - 1, width: 34, height: 34 }, "Qwen logo");
    }
    shape(slide, "ellipse", { left: 546, top: y + 5, width: 28, height: 28 }, {
      fill: i === 3 ? C.qwen : C.white,
      line: { style: "solid", fill: i === 3 ? C.qwen : C.blue, width: 3 },
    });
    text(slide, e[1], { left: 622, top: y - 2, width: 230, height: 30 }, { size: 22, bold: true, color: C.ink });
    text(slide, e[2], { left: 872, top: y, width: 326, height: 54 }, { size: 18, color: C.body });
  });
}

function agendaSlide(p) {
  const slide = p.slides.add();
  slide.background.fill = C.white;
  brand(slide);
  text(slide, "目录", { left: 76, top: 54, width: 180, height: 48 }, { size: 36, bold: true, color: C.ink });
  shape(slide, "rect", { left: 72, top: 118, width: 1140, height: 3 }, { fill: C.qwen, line: noLine() });
  const items = [
    ["1", "个人介绍", "试用期主线与能力背景"],
    ["2", "背景与目标", "教育推荐为什么需要 OneRec"],
    ["3", "工作产出与案例", "五个差异点 + 六个 demo case"],
    ["4", "主要工作", "Tokenizer、训练、下游任务、限制性解码"],
    ["5", "效果与复盘", "指标收益、坑点和后续方向"],
  ];
  items.forEach(([no, label, note], i) => {
    const y = 160 + i * 88;
    shape(slide, "rect", { left: 386, top: y + 9, width: 548, height: 50 }, { fill: C.qwen, line: noLine() });
    shape(slide, "ellipse", { left: 350, top: y, width: 68, height: 68 }, {
      fill: C.white,
      line: { style: "solid", fill: C.qwen, width: 2 },
      shadow: "shadow-sm",
    });
    text(slide, no, { left: 350, top: y + 13, width: 68, height: 36 }, { size: 31, bold: true, color: C.qwen, align: "center" });
    text(slide, label, { left: 434, top: y + 21, width: 450, height: 24 }, { size: 23, bold: true, color: C.white, align: "center" });
    text(slide, note, { left: 954, top: y + 23, width: 250, height: 20 }, { size: 12, color: C.muted });
  });
}

async function backgroundSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "2", "背景与目标", "为什么需要第三条路线", "04");
  shape(slide, "rect", { left: 84, top: 150, width: 5, height: 48 }, { fill: C.qwen, line: noLine() });
  text(slide, "优化背景", { left: 104, top: 145, width: 240, height: 38 }, { size: 30, bold: true, color: C.ink });
  text(slide, "业务需要探索第三条技术路线", { left: 106, top: 188, width: 430, height: 24 }, { size: 18, bold: true, color: C.muted });
  text(slide, "现有两条技术路线的结构性短板：", { left: 84, top: 238, width: 520, height: 24 }, { size: 20, bold: true, color: C.body });

  card(slide, 84, 282, 320, 128, { fill: "#F4F1FF", stroke: "#C8C2FF", width: 1.2 });
  text(slide, "路线一：Agent 编排检索", { left: 112, top: 308, width: 260, height: 24 }, { size: 19, bold: true, color: C.qwen });
  text(slide, "• 解释强、检索精度高\n• 多轮模型调用，端到端时延秒级/十秒级", { left: 112, top: 348, width: 260, height: 42 }, { size: 14, color: C.body });

  card(slide, 430, 282, 320, 128, { fill: "#F4F1FF", stroke: "#C8C2FF", width: 1.2 });
  text(slide, "路线二：传统判别推荐", { left: 458, top: 308, width: 260, height: 24 }, { size: 19, bold: true, color: C.qwen });
  text(slide, "• 数十毫秒响应，时效性优秀\n• 黑盒系统，缺乏推荐解释", { left: 458, top: 348, width: 260, height: 42 }, { size: 14, color: C.body });

  text(slide, "↓", { left: 378, top: 414, width: 74, height: 58 }, { size: 44, bold: true, color: C.qwen, align: "center" });
  card(slide, 146, 500, 604, 116, { fill: C.qwen, stroke: C.qwen, width: 0, radius: 12 });
  text(slide, "第三条路线：OneRec 生成式推荐", { left: 184, top: 526, width: 520, height: 26 }, { size: 22, bold: true, color: C.white });
  text(slide, "在满足在线时延约束的前提下，提供具备一定忠实性的推荐解释\n将对话、推理与生成式推荐统一于单一模型，同时提升推荐精度与可解释性", { left: 184, top: 562, width: 520, height: 40 }, { size: 14, color: "#EEF2FF" });

  card(slide, 818, 196, 354, 384, { fill: C.white, stroke: "#C7E7FF" });
  image(slide, await blobFor(img(1)), { left: 842, top: 236, width: 306, height: 268 }, "OneRec research overview", { fit: "contain" });
  text(slide, "OneRec 研究路线：预训练、后训练、评估闭环", { left: 852, top: 526, width: 286, height: 24 }, { size: 15, bold: true, color: C.navy, align: "center" });
}

function goalChallengeSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "2", "背景与目标", "一个模型，多种教育场景", "05");
  text(slide, "目标：产出教育领域的基座推荐模型", { left: 84, top: 150, width: 820, height: 34 }, { size: 28, bold: true, color: C.ink });
  text(slide, "以通用 LLM 为底座，注入 Item 语义理解与生成式推荐能力，通过指令适配推荐、搜索和题目理解。", { left: 84, top: 194, width: 980, height: 28 }, { size: 17, color: C.body });
  const items = [
    ["灾难性遗忘", "学会推荐的同时，不丢通用能力和 SID 对齐"],
    ["任务互扰与隔离", "一个模型干多种活，训练和上线都要互不牵连"],
    ["推荐质量度量", "冷启动缺少真实反馈，必须构造可靠监督与评估"],
    ["工程落地", "显式 CoT 慢且贵，新内容还要持续入库"],
  ];
  items.forEach((it, i) => {
    const x = 100 + (i % 2) * 556;
    const y = 268 + Math.floor(i / 2) * 138;
    card(slide, x, y, 500, 98, { fill: i % 2 ? "#F4F1FF" : "#F8FBFF", stroke: "#C7E7FF" });
    shape(slide, "rect", { left: x + 1, top: y + 1, width: 498, height: 4 }, { fill: i % 2 ? C.qwen : C.blue, line: noLine() });
    shape(slide, "ellipse", { left: x + 22, top: y + 22, width: 44, height: 44 }, { fill: C.qwen, line: noLine() });
    text(slide, String(i + 1), { left: x + 22, top: y + 32, width: 44, height: 22 }, { size: 18, bold: true, color: C.white, align: "center" });
    text(slide, it[0], { left: x + 84, top: y + 20, width: 360, height: 24 }, { size: 21, bold: true, color: C.ink });
    text(slide, it[1], { left: x + 84, top: y + 54, width: 370, height: 28 }, { size: 15, color: C.body });
  });
  text(slide, "核心判断：不是先做一个推荐模型，而是先搭出可训练、可约束、可评估的生产链路。", { left: 152, top: 592, width: 980, height: 28 }, { size: 20, bold: true, color: C.navy, align: "center" });
}

function outputsSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "3", "工作产出与案例", "五个差异点", "06");
  const items = [
    ["异构 Item 统一表征", "题目、试卷、视频、小讲堂进入同一词表空间"],
    ["通用能力保持", "两阶段预训练 + SFT 通用数据混合"],
    ["多源协同数据挖掘", "共现、语义近邻、教师推理链共同补足冷启动监督"],
    ["约束解码优化", "按任务裁剪 SID 空间，保证合法且减少重复"],
    ["全链路自动化评估", "覆盖语义 ID、通用能力、物品理解和推荐效果"],
  ];
  items.forEach((it, i) => {
    const x = i < 3 ? 84 + i * 372 : 270 + (i - 3) * 372;
    const y = i < 3 ? 176 : 424;
    card(slide, x, y, 326, 152, { fill: C.white, stroke: "#CFE4FF" });
    shape(slide, "rect", { left: x + 1, top: y + 1, width: 324, height: 5 }, { fill: i === 1 || i === 4 ? C.qwen : C.blue, line: noLine() });
    shape(slide, "ellipse", { left: x + 22, top: y + 22, width: 42, height: 42 }, { fill: C.qwen, line: noLine() });
    text(slide, String(i + 1), { left: x + 22, top: y + 32, width: 42, height: 22 }, { size: 18, bold: true, color: C.white, align: "center" });
    text(slide, it[0], { left: x + 78, top: y + 24, width: 224, height: 26 }, { size: 19, bold: true, color: C.ink });
    text(slide, it[1], { left: x + 28, top: y + 78, width: 270, height: 50 }, { size: 14, color: C.body });
  });
}

function demoOverviewSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "3", "工作产出与案例", "覆盖三类核心能力", "07");
  const groups = [
    ["题目推荐能力", "同知识点、同解题模型的举一反三", "case 1 / case 2"],
    ["异构类型推荐能力", "围绕同主题跨题目、视频、小讲堂推荐", "case 1 / case 2"],
    ["搜索能力", "从自然语言需求命中教育资源", "case 1 / case 2"],
  ];
  groups.forEach((g, i) => {
    const x = 112 + i * 360;
    card(slide, x, 208, 300, 244, { fill: i === 1 ? "#F4F1FF" : "#F8FBFF", stroke: "#C7E7FF" });
    shape(slide, "rect", { left: x + 1, top: 209, width: 298, height: 5 }, { fill: i === 1 ? C.qwen : C.blue, line: noLine() });
    shape(slide, "ellipse", { left: x + 26, top: 236, width: 46, height: 46 }, { fill: C.qwen, line: noLine() });
    text(slide, String(i + 1), { left: x + 26, top: 247, width: 46, height: 22 }, { size: 18, bold: true, color: C.white, align: "center" });
    text(slide, g[0], { left: x + 88, top: 238, width: 180, height: 26 }, { size: 20, bold: true, color: C.ink });
    text(slide, g[1], { left: x + 28, top: 312, width: 244, height: 50 }, { size: 15, color: C.body });
    text(slide, g[2], { left: x + 28, top: 390, width: 244, height: 22 }, { size: 14, bold: true, color: C.qwen, align: "center" });
  });
  text(slide, "每个 case 保留输入、模型输出、LLM-Judge 和对比场景，证明不是只看离线指标。", { left: 148, top: 548, width: 980, height: 28 }, { size: 20, bold: true, color: C.navy, align: "center" });
}

const CASE_INPUTS = {
  "08": "某学生利用身边常见的物质解决日常生活中的有关问题，下列说法中不正确的是()\nA. 用木炭除去冰箱里的异味\nB. 用洗洁精清洗衣物上的油污\nC. 用肥皂水降低生活用水的硬度\nD. 用灯火检验地窖中二氧化碳的含量是否超标",
  "09": "保护某种动物的最好措施是消灭它的天敌。_(判断对错)",
  "10": "迟日江山丽，春风花草香 描述的是春天的景象。_(判断对错)",
  "11": "迟日江山丽，春风花草香 描述的是春天的景象。_(判断对错)",
  "12": "鸡兔同笼",
  "13": "鸡兔同笼",
};

const CASE_COMPARE_CROPS = {
  "08": `${CASE_COMPARE_CROP_DIR}/case08_compare_question.png`,
  "09": `${CASE_COMPARE_CROP_DIR}/case09_compare_question.png`,
  "12": `${CASE_COMPARE_CROP_DIR}/case12_compare_question.png`,
  "13": `${CASE_COMPARE_CROP_DIR}/case13_compare_question.png`,
};

const CASE_COMPARE_TEXTS = {
  "12": ["Agent 对比命中 · 应用题", "张伯伯家养了鹅和兔共 17 只，兔的脚比鹅的脚总共多 20 只，鹅和兔各有多少只？"],
  "13": ["Agent 对比命中 · 试卷", "《9 数学广角——鸡兔同笼》试卷及答案；四年级下册第九单元专项测试卷。"],
};

function caseInputBox(slide, label, body, x, y, w, h, opts = {}) {
  if (opts.labelOutside) {
    text(slide, label, { left: x, top: y - 26, width: w, height: 18 }, {
      size: 15,
      bold: true,
      color: C.qwen,
      align: "center",
    });
    card(slide, x, y, w, h, { fill: "#F8FBFF", stroke: "#C7E7FF", shadow: "shadow-none" });
    const size = body.length > 120 ? 10.5 : body.length > 50 ? 13 : 18;
    text(slide, body, { left: x + 14, top: y + 14, width: w - 28, height: h - 24 }, {
      size,
      bold: body.length <= 12,
      color: C.body,
    });
    return;
  }
  card(slide, x, y, w, h, { fill: "#F8FBFF", stroke: "#C7E7FF", shadow: "shadow-none" });
  text(slide, label, { left: x + 18, top: y + 16, width: w - 36, height: 24 }, {
    size: 18,
    bold: true,
    color: C.qwen,
  });
  const size = body.length > 120 ? 12.5 : body.length > 50 ? 15 : 18;
  text(slide, body, { left: x + 18, top: y + 50, width: w - 36, height: h - 62 }, {
    size,
    bold: body.length <= 12,
    color: C.body,
  });
}

async function caseImageBox(slide, label, imageNo, x, y, w, h, opts = {}) {
  text(slide, label, { left: x, top: y - 26, width: w, height: 18 }, {
    size: opts.labelSize ?? 15,
    bold: true,
    color: C.qwen,
    align: "center",
  });
  card(slide, x, y, w, h, { fill: C.white, stroke: "#C7E7FF", shadow: "shadow-none" });
  image(slide, await blobFor(imagePath(imageNo)), { left: x + 8, top: y + 8, width: w - 16, height: h - 16 }, label, { fit: "contain" });
}

async function caseCompareBox(slide, page, fallbackImage, x, y, w, h) {
  text(slide, "对比场景", { left: x, top: y - 26, width: w, height: 18 }, {
    size: 15,
    bold: true,
    color: C.qwen,
    align: "center",
  });
  card(slide, x, y, w, h, { fill: C.white, stroke: "#C7E7FF", shadow: "shadow-none" });
  const compareText = CASE_COMPARE_TEXTS[page];
  if (compareText) {
    text(slide, compareText[0], { left: x + 18, top: y + 22, width: w - 36, height: 22 }, {
      size: 16,
      bold: true,
      color: C.qwen,
    });
    text(slide, compareText[1], { left: x + 18, top: y + 62, width: w - 36, height: h - 78 }, {
      size: 15,
      color: C.body,
    });
    return;
  }
  image(slide, await blobFor(CASE_COMPARE_CROPS[page] ?? imagePath(fallbackImage)), { left: x + 8, top: y + 8, width: w - 16, height: h - 16 }, "对比场景", { fit: "contain" });
}

function caseConclusionBox(slide, conclusion, x, y, w, h) {
  card(slide, x, y, w, h, { fill: "#F4F1FF", stroke: "#CDC8FF" });
  shape(slide, "rect", { left: x + 1, top: y + 1, width: w - 2, height: 4 }, { fill: C.qwen, line: noLine() });
  text(slide, "case 结论", { left: x + 18, top: y + 12, width: 86, height: 18 }, { size: 14, bold: true, color: C.qwen });
  text(slide, conclusion, { left: x + 116, top: y + 10, width: w - 136, height: h - 16 }, { size: 13, bold: true, color: C.navy });
}

async function caseSlide(p, page, title, subtitle, imgs, conclusion) {
  const slide = p.slides.add();
  pageChrome(slide, "3", "工作产出与案例", title, page);
  text(slide, subtitle, { left: 84, top: 136, width: 1030, height: 30 }, { size: 23, bold: true, color: C.ink });
  const inputText = CASE_INPUTS[page] ?? "见输入样例";
  if (imgs.length === 4) {
    caseInputBox(slide, "输入", inputText, 84, 196, 300, 132, { labelOutside: true });
    await caseCompareBox(slide, page, imgs[3], 84, 378, 300, 202);
    await caseImageBox(slide, "输出", imgs[1], 410, 196, 370, 384);
    await caseImageBox(slide, "LLM-Judge", imgs[2], 806, 196, 390, 384);
    caseConclusionBox(slide, conclusion, 806, 604, 390, 64);
  } else {
    caseInputBox(slide, "输入", inputText, 84, 196, 270, 132, { labelOutside: true });
    await caseImageBox(slide, "输出", imgs[1], 374, 196, 400, 384);
    await caseImageBox(slide, "LLM-Judge", imgs[2], 794, 196, 402, 384);
    caseConclusionBox(slide, conclusion, 794, 604, 402, 64);
  }
}

async function workOverviewSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "模型生产 pipeline", "14");
  image(slide, await blobFor(img(24)), { left: 92, top: 158, width: 1096, height: 404 }, "Pipeline overview", { fit: "contain" });
  text(slide, "主线：先让模型认识教育 Item，再注入推荐任务，最后用自动评估和约束解码做回归闭环。", { left: 148, top: 604, width: 984, height: 28 }, { size: 19, bold: true, color: C.navy, align: "center" });
}

async function tokenizerSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "Tokenizer：统一异构 Item", "15");
  text(slide, "Item 语义文本 -> embedding -> RQ-VAE -> SID codebook", { left: 86, top: 150, width: 760, height: 28 }, { size: 21, bold: true, color: C.navy });
  image(slide, await blobFor(img(25)), { left: 100, top: 202, width: 720, height: 270 }, "Tokenizer architecture", { fit: "contain" });
  callout(slide, "SID 结构", "<|item_begin|>类型,学段,学科,<a_x><b_y><c_z><|item_end|>\n文本标签负责类型感知，SID 负责语义离散化。", 856, 204, 320, 126);
  callout(slide, "异构类型", "题目、试卷、视频、小讲堂进入同一空间；新类型可继续用文本标签扩展。", 856, 360, 320, 112, C.navy);
  text(slide, "设计要点：高频题目降采样，长尾视频/试卷过采样，避免单一题目类型主导词表。", { left: 164, top: 586, width: 950, height: 26 }, { size: 18, bold: true, color: C.navy, align: "center" });
}

async function tokenizerCaseSlide(p) {
  const data = [
    ["化学", 26, "<a_905><b_4><c_786>", "16", "化学题簇聚合了同一主题下的物质性质、生活应用与实验判断题。"],
    ["数学", 27, "<a_1816><b_492><c_976>", "17", "数学题簇聚合同类计算与推理模型，便于检查 SID 是否保留解题结构。"],
    ["地理", 28, "<a_21><b_1572><c_1578>", "18", "地理题簇聚合同区域与知识点相关内容，验证跨题干表述下的语义一致性。"],
  ];
  for (let i = 0; i < data.length; i++) {
    const [subject, imageNo, sid, page, note] = data[i];
    const slide = p.slides.add();
    pageChrome(slide, "4", "主要工作", `Tokenizer：${subject} SID 簇`, page);
    text(slide, `SID code：${sid}`, { left: 92, top: 138, width: 520, height: 22 }, { size: 18, bold: true, color: C.muted });
    card(slide, 74, 166, 1132, 460, { fill: C.white, stroke: "#C7E7FF", shadow: "shadow-none" });
    image(slide, await blobFor(img(imageNo)), { left: 88, top: 180, width: 1104, height: 432 }, `${subject} SID cluster case`, { fit: "contain" });
    card(slide, 160, 642, 960, 48, { fill: "#F4F1FF", stroke: "#CDC8FF" });
    text(slide, note, { left: 194, top: 658, width: 894, height: 18 }, { size: 16, bold: true, color: C.navy, align: "center" });
  }
}

function trainingSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "训练：两阶段 CPT + SFT", "19");
  text(slide, "Backbone: Qwen3-8B；训练框架：MS-Swift", { left: 86, top: 150, width: 520, height: 28 }, { size: 22, bold: true, color: C.navy });
  const stages = [
    ["Stage 1", "冻结主干", "只训练新增 item token embedding，降低污染"],
    ["Stage 2", "领域-通用混合", "推荐数据混合 reasoning-heavy 通用语料，低学习率全参训练"],
    ["SFT", "轻量指令调整", "推荐指令 + 通用指令/推理数据继续混合"],
  ];
  stages.forEach((s, i) => {
    const x = 112 + i * 388;
    card(slide, x, 224, 282, 134, { fill: i === 1 ? "#F4F1FF" : "#F8FBFF", stroke: "#C7E7FF" });
    text(slide, s[0], { left: x + 24, top: 248, width: 230, height: 24 }, { size: 20, bold: true, color: C.qwen, align: "center" });
    text(slide, s[1], { left: x + 24, top: 282, width: 230, height: 24 }, { size: 19, bold: true, color: C.ink, align: "center" });
    text(slide, s[2], { left: x + 28, top: 318, width: 226, height: 32 }, { size: 13, color: C.body, align: "center" });
    if (i < 2) text(slide, "→", { left: x + 300, top: 270, width: 70, height: 34 }, { size: 28, bold: true, color: C.qwen, align: "center" });
  });
  callout(slide, "为什么沿用 Qwen3-8B", "OneRec 系列研究和前期探索都基于 Qwen3；新模型架构变化更大，当前框架适配风险高。", 148, 430, 456, 116, C.navy);
  callout(slide, "训练效率优化", "数据分片并行读入、selective 重计算、DP 通信重叠：CPT 时间 -23.0%，SFT 时间 -57.4%。", 676, 430, 456, 116, C.green);
}

function generalEvalSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "下游任务：通用能力", "20");
  text(slide, "通用数据仅使用 OpenOneRec 的 20%，通用能力有折损，但可作为后续恢复方向。", { left: 84, top: 150, width: 1020, height: 28 }, { size: 20, bold: true, color: C.ink });
  const headers = ["模型", "GSM8K", "MATH", "AIME", "MMLU", "GPQA", "IFEVAL"];
  const rows = [
    ["Qwen3-8B", "93.03", "80.80", "24.37", "63.80", "43.94", "80.78"],
    ["OpenOneRec SFT", "90.60", "87.60", "6.88", "49.09", "33.84", "56.38"],
    ["Ours", "84.31", "53.80", "3.75", "33.46", "20.71", "53.23"],
  ];
  const x0 = 92, y0 = 230, cw = [200, 130, 130, 130, 130, 130, 130], rh = 62;
  let x = x0;
  headers.forEach((h, i) => {
    shape(slide, "rect", { left: x, top: y0, width: cw[i], height: 46 }, { fill: C.qwen, line: { style: "solid", fill: C.white, width: 1 } });
    text(slide, h, { left: x + 8, top: y0 + 13, width: cw[i] - 16, height: 18 }, { size: 14, bold: true, color: C.white, align: "center" });
    x += cw[i];
  });
  rows.forEach((r, ri) => {
    x = x0;
    r.forEach((v, ci) => {
      shape(slide, "rect", { left: x, top: y0 + 46 + ri * rh, width: cw[ci], height: rh }, {
        fill: ri === 2 ? "#F4F1FF" : ri === 1 ? "#F8FBFF" : C.white,
        line: { style: "solid", fill: "#D5E0F2", width: 1 },
      });
      text(slide, ci === 0 ? v : `${v}%`, { left: x + 8, top: y0 + 67 + ri * rh, width: cw[ci] - 16, height: 20 }, {
        size: ci === 0 ? 13 : 15,
        bold: ri === 2,
        color: ri === 2 ? C.qwen : C.body,
        align: "center",
      });
      x += cw[ci];
    });
  });
  text(slide, "结论：当前重点是先跑通教育推荐链路；通用能力恢复需要更大通用数据配比、OPD/RL 继续验证。", { left: 150, top: 548, width: 980, height: 28 }, { size: 18, bold: true, color: C.navy, align: "center" });
}

function itemUnderstandingSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "下游任务：物品理解", "21");
  text(slide, "Layer 0：验证模型是否理解 SID 表征，而不只是记住文本。", { left: 84, top: 150, width: 900, height: 28 }, { size: 21, bold: true, color: C.ink });
  callout(slide, "Text -> SID", "不给类型/学段/学科，只输入题干、知识点、难度等，让模型预测完整 SID。", 92, 216, 500, 116, C.qwen);
  callout(slide, "SID -> Text", "给定完整 SID，让模型还原类型、学段、学科、知识点和题干描述。", 688, 216, 500, 116, C.navy);
  const rows = [
    ["baseline hot", "0.930", "[0.652,0.207,0.039]", "0.170", "0.943"],
    ["baseline tail", "0.983", "[0.667,0.228,0.018]", "0.121", "0.845"],
  ];
  const cols = ["模型", "类型学段学科", "SID 前缀", "SID 有效", "回退有效"];
  const x0 = 164, y0 = 404, widths = [190, 170, 250, 150, 150];
  let x = x0;
  cols.forEach((c, i) => {
    shape(slide, "rect", { left: x, top: y0, width: widths[i], height: 38 }, { fill: C.qwen, line: { style: "solid", fill: C.white, width: 1 } });
    text(slide, c, { left: x + 6, top: y0 + 11, width: widths[i] - 12, height: 16 }, { size: 13, bold: true, color: C.white, align: "center" });
    x += widths[i];
  });
  rows.forEach((r, ri) => {
    x = x0;
    r.forEach((v, i) => {
      shape(slide, "rect", { left: x, top: y0 + 38 + ri * 44, width: widths[i], height: 44 }, { fill: ri ? "#F8FBFF" : C.white, line: { style: "solid", fill: "#D5E0F2", width: 1 } });
      text(slide, v, { left: x + 6, top: y0 + 52 + ri * 44, width: widths[i] - 12, height: 18 }, { size: 13, color: i === 3 ? C.red : C.body, align: "center" });
      x += widths[i];
    });
  });
  text(slide, "问题暴露：三级 SID 命中和 SID 有效率偏低，后续需要从训练和解码两侧解决。", { left: 168, top: 590, width: 944, height: 26 }, { size: 18, bold: true, color: C.navy, align: "center" });
}

function i2iTaskSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "下游任务：I2I 推荐", "22");
  text(slide, "Layer 1-3：基础推荐 -> 指令遵循 -> 推荐理由", { left: 84, top: 150, width: 760, height: 28 }, { size: 21, bold: true, color: C.ink });
  callout(slide, "任务定义", "输入锚点物品 + 结构化约束，输出 CoT、推荐 SID 和逐项推荐理由。", 84, 212, 500, 116);
  callout(slide, "Item 反查", "生成 SID 后经 SQLite 索引反查真实物品；精确未命中时按前缀逐级回退。", 696, 212, 500, 116, C.navy);
  const items = [
    ["书籍共现", "同知识点/同错因下构造相似 pair", "高"],
    ["试卷共现", "同一试卷内题目经 ItemCF/Swing 挖掘", "中"],
    ["用户行为", "拍搜日志共现补充弱协同信号", "弱"],
    ["语义相似", "embedding 近邻召回跨类型相似 item", "弱"],
  ];
  items.forEach((it, i) => {
    const x = 94 + i * 286;
    card(slide, x, 408, 242, 96, { fill: i % 2 ? "#F4F1FF" : "#F8FBFF", stroke: "#C7E7FF" });
    text(slide, it[0], { left: x + 18, top: 428, width: 206, height: 20 }, { size: 17, bold: true, color: C.qwen, align: "center" });
    text(slide, it[1], { left: x + 18, top: 458, width: 206, height: 28 }, { size: 12, color: C.body, align: "center" });
    text(slide, `因果性：${it[2]}`, { left: x + 18, top: 486, width: 206, height: 16 }, { size: 11, color: C.muted, align: "center" });
  });
}

async function i2iBaselineSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "评估暴露的问题", "23");
  text(slide, "结构合规没问题，但有效 SID 和去重不足会拖累真实推荐质量。", { left: 84, top: 150, width: 980, height: 28 }, { size: 21, bold: true, color: C.ink });
  const metrics = [
    ["SID 去重率", 40.8, C.red],
    ["SID 有效率", 46.5, C.red],
    ["回退有效率", 98.3, C.green],
  ];
  metrics.forEach((m, i) => {
    const y = 232 + i * 92;
    text(slide, m[0], { left: 112, top: y, width: 160, height: 24 }, { size: 19, bold: true, color: C.ink });
    shape(slide, "roundRect", { left: 300, top: y + 4, width: 420, height: 16 }, { fill: "#E5E7EB", line: noLine(), radius: 8 });
    shape(slide, "roundRect", { left: 300, top: y + 4, width: 420 * m[1] / 100, height: 16 }, { fill: m[2], line: noLine(), radius: 8 });
    text(slide, `${m[1]}%`, { left: 742, top: y - 2, width: 80, height: 24 }, { size: 18, bold: true, color: m[2] });
  });
  image(slide, await blobFor(img(29)), { left: 842, top: 214, width: 310, height: 270 }, "LLM judge table", { fit: "contain" });
  card(slide, 150, 540, 980, 64, { fill: "#F4F1FF", stroke: "#CDC8FF" });
  text(slide, "解法指向：推理期限制性解码，让 SID 必然来自在库空间，并在同一请求内主动去重。", { left: 194, top: 562, width: 900, height: 24 }, { size: 19, bold: true, color: C.navy, align: "center" });
}

function constrainedDecodingSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "推理：限制性解码", "24");
  text(slide, "用 Trie 把下一步 SID code 候选集限制为真实在库 token。", { left: 84, top: 150, width: 900, height: 28 }, { size: 21, bold: true, color: C.ink });
  const steps = [
    ["1", "定位 SID 块", "lookback 窗口内找到最近的 <|item_begin|>"],
    ["2", "解析标签与层级", "得到类型/学段/学科，以及当前生成到第几级 code"],
    ["3", "查 Trie allowed_next", "只保留合法下一层 code，其余 logits 置为 -inf"],
    ["4", "可选去重剪枝", "已生成过的 SID 子树优先剪掉；剪空则回退，绝不卡死"],
  ];
  steps.forEach((s, i) => {
    const x = i < 2 ? 100 : 680;
    const y = i % 2 === 0 ? 226 : 390;
    card(slide, x, y, 500, 104, { fill: i % 2 ? "#F4F1FF" : "#F8FBFF", stroke: "#C7E7FF" });
    shape(slide, "ellipse", { left: x + 22, top: y + 26, width: 48, height: 48 }, { fill: C.qwen, line: noLine() });
    text(slide, s[0], { left: x + 22, top: y + 38, width: 48, height: 22 }, { size: 18, bold: true, color: C.white, align: "center" });
    text(slide, s[1], { left: x + 90, top: y + 24, width: 360, height: 24 }, { size: 20, bold: true, color: C.ink });
    text(slide, s[2], { left: x + 90, top: y + 58, width: 360, height: 32 }, { size: 14, color: C.body });
  });
  text(slide, "请求路由：通过 system prompt marker 识别任务；text2sid 挂完整库，i2i_rec 只挂优质题库。", { left: 154, top: 586, width: 980, height: 26 }, { size: 18, bold: true, color: C.navy, align: "center" });
}

function cdEffectSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "4", "主要工作", "限制性解码效果", "25");
  const rows = [
    ["SID 去重率", "40.8%", "97.2%", "+138%"],
    ["SID 有效率", "46.5%", "100.0%", "+115%"],
    ["回退有效率", "98.3%", "100.0%", "+1.7%"],
  ];
  text(slide, "I2I 结构化合规性显著提升", { left: 84, top: 150, width: 600, height: 30 }, { size: 24, bold: true, color: C.ink });
  rows.forEach((r, i) => {
    const y = 226 + i * 92;
    text(slide, r[0], { left: 112, top: y, width: 160, height: 24 }, { size: 19, bold: true, color: C.ink });
    shape(slide, "roundRect", { left: 306, top: y + 4, width: 250, height: 14 }, { fill: "#E5E7EB", line: noLine(), radius: 7 });
    shape(slide, "roundRect", { left: 306, top: y + 4, width: 250 * parseFloat(r[1]) / 100, height: 14 }, { fill: "#A3A8B8", line: noLine(), radius: 7 });
    shape(slide, "roundRect", { left: 306, top: y + 30, width: 250, height: 14 }, { fill: "#E5E7EB", line: noLine(), radius: 7 });
    shape(slide, "roundRect", { left: 306, top: y + 30, width: 250 * parseFloat(r[2]) / 100, height: 14 }, { fill: C.qwen, line: noLine(), radius: 7 });
    text(slide, r[1], { left: 576, top: y - 2, width: 80, height: 20 }, { size: 14, color: C.muted });
    text(slide, r[2], { left: 576, top: y + 24, width: 80, height: 20 }, { size: 14, bold: true, color: C.qwen });
    text(slide, r[3], { left: 668, top: y + 10, width: 90, height: 24 }, { size: 18, bold: true, color: C.green });
  });
  callout(slide, "物品理解", "baseline-cd 将 SID 有效率和回退有效率提升至 100%，三级 SID 命中同步改善。", 810, 210, 328, 116, C.green);
  callout(slide, "推荐质量", "LLM-Judge 质量小幅提升，但约束解码主要解决结构合法和幻觉问题。", 810, 366, 328, 116, C.navy);
}

async function summarySlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "5", "效果与复盘", "问题、反思和后续方向", "26");
  const left = [
    "模型生产链路长，资源消耗较大，迭代效率仍需优化",
    "部分优化偏技术侧，后续要更深结合业务链路",
    "更多下游任务协同、OPD/RL 效果还需要继续验证",
  ];
  const right = [
    "继续探索 Tokenizer 码本大小、模型大小和训练配比",
    "搜索场景蒸馏现有 Agent 链路，接入线上评估",
    "验证 OPD/RL 对通用能力恢复和推荐效果的收益",
  ];
  callout(slide, "项目复盘", left.join("\n"), 92, 172, 500, 176, C.red);
  callout(slide, "未来方向", right.join("\n"), 688, 172, 500, 176, C.green);
  image(slide, await blobFor(img(30)), { left: 156, top: 396, width: 968, height: 176 }, "Future optimization map", { fit: "contain" });
  text(slide, "下一阶段目标：从“模型能力验证”走向“业务场景闭环验证”。", { left: 188, top: 606, width: 900, height: 28 }, { size: 20, bold: true, color: C.navy, align: "center" });
}

async function appendixDataSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "A", "附录", "数据构造样例", "27");
  const data = [
    ["Tokenizer 输入", 31],
    ["CPT 输入", 32],
    ["通用知识", 33],
    ["SFT 输入", 34],
    ["SFT 通用数据", 35],
  ];
  const slots = [
    [84, 168, 520, 144],
    [676, 168, 520, 144],
    [84, 350, 330, 112],
    [456, 350, 520, 144],
    [1008, 350, 188, 112],
  ];
  for (let i = 0; i < data.length; i++) {
    const [x, y, w, h] = slots[i];
    text(slide, data[i][0], { left: x, top: y - 24, width: w, height: 18 }, { size: 14, bold: true, color: C.qwen });
    card(slide, x, y, w, h, { fill: C.white, stroke: "#C7E7FF", shadow: "shadow-none" });
    image(slide, await blobFor(img(data[i][1])), { left: x + 8, top: y + 8, width: w - 16, height: h - 16 }, data[i][0], { fit: "contain" });
  }
}

async function appendixEvalSlide(p) {
  const slide = p.slides.add();
  pageChrome(slide, "A", "附录", "评估定义", "28");
  const data = [
    ["I2I 结构化合规性", 36],
    ["LLM-Judge 维度", 37],
    ["Judge 评分表", 38],
  ];
  const slots = [
    [82, 168, 360, 170],
    [466, 168, 360, 230],
    [852, 168, 326, 300],
  ];
  for (let i = 0; i < data.length; i++) {
    const [x, y, w, h] = slots[i];
    text(slide, data[i][0], { left: x, top: y - 24, width: w, height: 18 }, { size: 14, bold: true, color: C.qwen });
    card(slide, x, y, w, h, { fill: C.white, stroke: "#C7E7FF", shadow: "shadow-none" });
    image(slide, await blobFor(img(data[i][1])), { left: x + 8, top: y + 8, width: w - 16, height: h - 16 }, data[i][0], { fit: "contain" });
  }
  text(slide, "评估口径与训练目标保持一致：结构先合规，再看语义关联和理由忠实度。", { left: 154, top: 568, width: 980, height: 26 }, { size: 18, bold: true, color: C.navy, align: "center" });
}

function thanksSlide(p) {
  const slide = p.slides.add();
  slide.background.fill = C.navy;
  image(slide, bgBytes, { left: 0, top: 0, width: W, height: H }, "Qwen background", { fit: "cover" });
  shape(slide, "rect", { left: 0, top: 0, width: W, height: H }, { fill: "#14113DDD", line: noLine() });
  shape(slide, "rect", { left: 0, top: 0, width: 250, height: H }, { fill: C.blue, line: noLine() });
  text(slide, "Thanks", { left: 480, top: 226, width: 320, height: 60 }, { size: 50, bold: false, color: C.white, align: "center" });
  text(slide, "感谢主管、师兄、HRG 和团队同学的支持", { left: 380, top: 324, width: 520, height: 26 }, { size: 20, bold: true, color: "#E8ECFF", align: "center" });
  image(slide, logoBytes, { left: 510, top: 400, width: 58, height: 58 }, "Qwen logo");
  text(slide, "Qwen 千问", { left: 586, top: 412, width: 160, height: 30 }, { size: 22, bold: true, color: C.white });
  text(slide, "李思奥（龙舌兰）| 阿里千问 - 学习创新", { left: 410, top: 498, width: 460, height: 18 }, { size: 13, color: "#E8ECFF", align: "center" });
}

async function main() {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  logoBytes = await readImageBlob(LOGO_PATH);
  bgBytes = await readImageBlob(BG_PATH);
  rucLogoBytes = await readImageBlob(RUC_LOGO_PATH);
  tencentAdsLogoBytes = await readImageBlob(TENCENT_ADS_LOGO_PATH);
  const p = Presentation.create({ slideSize: { width: W, height: H } });

  titleSlide(p);
  agendaSlide(p);
  introSlide(p);
  await backgroundSlide(p);
  goalChallengeSlide(p);
  outputsSlide(p);
  demoOverviewSlide(p);
  await caseSlide(p, "08", "题目推荐能力 case 1", "质量守恒定律：推荐同知识点、同判据题目", [2, 3, 4, 5], "推荐结果能围绕守恒定律给出迁移理由，并通过 Judge 验证关联质量。");
  await caseSlide(p, "09", "题目推荐能力 case 2", "古诗意象判断：对比场景暴露无关科目问题", [6, 7, 8, 9], "模型能输出题目推荐与理由，对比场景体现需要更强类型与学科约束。");
  await caseSlide(p, "10", "异构类型推荐 case 1", "同主题跨类型资源推荐", [10, 11, 12], "异构 Item 统一表征后，可以从锚点题目扩展到多形态教育资源。");
  await caseSlide(p, "11", "异构类型推荐 case 2", "同主题跨类型补充学习资源", [13, 14, 15], "模型不只召回题目，也能组织视频、小讲堂等延伸学习内容。");
  await caseSlide(p, "12", "搜索能力 case 1", "自然语言需求到教育资源命中", [16, 17, 18, 19], "搜索 case 验证模型在资源理解和结果解释上的端到端能力。");
  await caseSlide(p, "13", "搜索能力 case 2", "自然语言需求到教育资源命中", [20, 21, 22, 23], "与 Agent 搜题链路相比，生成式路线更适合沉淀为低延迟服务。");
  await workOverviewSlide(p);
  await tokenizerSlide(p);
  await tokenizerCaseSlide(p);
  trainingSlide(p);
  generalEvalSlide(p);
  itemUnderstandingSlide(p);
  i2iTaskSlide(p);
  await i2iBaselineSlide(p);
  constrainedDecodingSlide(p);
  cdEffectSlide(p);
  await summarySlide(p);
  await appendixDataSlide(p);
  await appendixEvalSlide(p);
  thanksSlide(p);

  const inspect = await p.inspect({ kind: "slide,textbox,shape,image", maxChars: 12000 });
  await fs.writeFile(`${OUT}.inspect.ndjson`, inspect.ndjson);
  for (const [index, slide] of p.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(PREVIEW_DIR, `${stem}.png`), await p.export({ slide, format: "png", scale: 1 }));
  }
  await writeBlob(path.join(PREVIEW_DIR, "deck-montage.webp"), await p.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(p);
  await pptx.save(OUT);
  console.log(OUT);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
