import fs from "node:fs/promises";
import path from "node:path";
import { buildSectionDeck, ROOT, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("01");

// Section-specific edits for 01 个人介绍 go here.
// This section owns: title page, agenda page, personal timeline page.
const C = {
  qwen: "#635BFF",
  blue: "#00A8FF",
  ink: "#111827",
  body: "#344054",
  white: "#FFFFFF",
  line: "#B9C2E8",
};

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
  const box = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: noLine(),
  });
  box.text = value;
  box.text.style = {
    fontSize: opts.size ?? 18,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
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

function deleteBodyObjects(slide) {
  for (const collection of [slide.shapes.items, slide.images.items]) {
    for (const item of [...collection]) {
      const top = Number(item.position.top);
      if (top >= 126 && top < 662) {
        item.delete();
      }
    }
  }
}

async function refinePersonalTimeline(slide) {
  const qwenLogo = path.join(ROOT, "assets", "qwen", "qwen-logo.png");
  const rucLogo = path.join(ROOT, "assets", "brand", "ruc-seal.png");
  const tencentAdsLogo = path.join(ROOT, "assets", "brand", "tencent-ads-logo.png");

  deleteBodyObjects(slide);

  text(slide, "李思奥（龙舌兰）", { left: 88, top: 152, width: 390, height: 54 }, {
    size: 36,
    bold: true,
    color: C.qwen,
  });
  shape(slide, "rect", { left: 92, top: 220, width: 150, height: 4 }, { fill: C.qwen });

  shape(slide, "rect", { left: 558, top: 150, width: 2, height: 430 }, { fill: C.line });

  const events = [
    {
      logo: rucLogo,
      logoPosition: { left: 452, top: 157, width: 50, height: 50 },
      date: "2018.09 - 2024.06",
      text: "中国人民大学统计学院（本硕）",
    },
    {
      logo: tencentAdsLogo,
      logoPosition: { left: 424, top: 270, width: 116, height: 22 },
      date: "2024.07 - 2025.03",
      text: "流量支持中心\n广告业务问题全链路策略优化",
    },
    {
      logo: tencentAdsLogo,
      logoPosition: { left: 424, top: 372, width: 116, height: 22 },
      date: "2025.04 - 2026.03",
      text: "AI 推荐中心\n生成式推荐与大模型广告落地",
    },
    {
      logo: qwenLogo,
      logoPosition: { left: 430, top: 469, width: 34, height: 34 },
      date: "2026.04 - 至今",
      text: "学习创新\n教育 OneRec 探索",
      active: true,
    },
  ];

  events.forEach((event, index) => {
    const y = 164 + index * 102;
    shape(slide, "ellipse", { left: 546, top: y + 5, width: 28, height: 28 }, {
      fill: event.active ? C.qwen : C.white,
      line: { style: "solid", fill: event.active ? C.qwen : C.blue, width: 3 },
    });
    text(slide, event.date, { left: 622, top: y - 2, width: 230, height: 30 }, {
      size: 22,
      bold: true,
      color: C.ink,
    });
    text(slide, event.text, { left: 872, top: y, width: 326, height: 54 }, {
      size: 18,
      color: C.body,
    });
  });

  for (const event of events) {
    await image(slide, event.logo, event.logoPosition, "timeline logo");
  }
}

await refinePersonalTimeline(deck.slides.items[2]);

await saveSectionDeck("01", deck);
