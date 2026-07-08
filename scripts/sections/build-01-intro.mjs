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
  const config = {
    geometry,
    position,
    fill: opts.fill ?? C.white,
    line: opts.line ?? noLine(),
    shadow: opts.shadow ?? "shadow-none",
  };
  if (opts.radius !== undefined) {
    config.borderRadius = opts.radius;
  }
  return slide.shapes.add(config);
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

function refineAgenda(slide) {
  deleteBodyObjects(slide);

  const agenda = [
    "个人介绍",
    "背景与目标",
    "工作产出与案例",
    "主要工作",
    "思考与总结",
  ];
  const circleLeft = 313;
  const barLeft = circleLeft + 76;
  const barWidth = 967 - barLeft;
  const firstTop = 176;
  const rowGap = 88;

  agenda.forEach((label, index) => {
    const circleTop = firstTop + index * rowGap;
    const barTop = circleTop + 9;

    shape(slide, "roundRect", { left: barLeft, top: barTop, width: barWidth, height: 50 }, {
      fill: C.qwen,
      radius: 8,
    });
    shape(slide, "ellipse", { left: circleLeft, top: circleTop, width: 68, height: 68 }, {
      fill: C.white,
      line: { style: "solid", fill: C.qwen, width: 2 },
    });
    text(slide, String(index + 1), { left: circleLeft, top: circleTop + 13, width: 68, height: 36 }, {
      size: 30,
      bold: true,
      color: C.qwen,
      align: "center",
    });
    text(slide, label, { left: barLeft, top: barTop + 11, width: barWidth, height: 28 }, {
      size: 26,
      bold: true,
      color: C.white,
      align: "center",
    });
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

function refineTitleSlide(slide) {
  deleteBodyObjects(slide);

  shape(slide, "rect", { left: 96, top: 246, width: 88, height: 6 }, { fill: C.qwen });
  text(slide, "试用期转正答辩", { left: 96, top: 270, width: 660, height: 58 }, {
    size: 44,
    bold: true,
    color: C.ink,
  });
  text(slide, "教育 OneRec 探索", { left: 98, top: 342, width: 420, height: 36 }, {
    size: 28,
    bold: true,
    color: C.qwen,
  });
  shape(slide, "rect", { left: 98, top: 398, width: 520, height: 2 }, { fill: C.line });

  text(slide, "李思奥（龙舌兰）", { left: 98, top: 440, width: 360, height: 28 }, {
    size: 22,
    bold: true,
    color: C.ink,
  });
  text(slide, "2026.04.13 – 2026.07.12", { left: 98, top: 476, width: 360, height: 24 }, {
    size: 17,
    color: C.body,
  });
  text(slide, "从教育资源理解到可约束、可评估的生成式推荐链路", { left: 98, top: 542, width: 660, height: 32 }, {
    size: 22,
    color: C.ink,
  });

  shape(slide, "ellipse", { left: 1042, top: 238, width: 56, height: 56 }, { fill: C.blue });
  shape(slide, "ellipse", { left: 972, top: 146, width: 116, height: 116 }, { fill: "#D9D7FF" });
  text(slide, "OneRec", { left: 942, top: 514, width: 260, height: 44 }, {
    size: 34,
    bold: true,
    color: C.white,
    align: "center",
  });
  text(slide, "Qwen | 学习创新", { left: 942, top: 566, width: 260, height: 22 }, {
    size: 15,
    bold: true,
    color: C.white,
    align: "center",
  });
}

function removeTimelineHeaderSubtitle(slide) {
  for (const item of [...slide.shapes.items]) {
    const left = Number(item.position.left);
    const top = Number(item.position.top);
    if (left >= 120 && left < 820 && top >= 40 && top < 90 && item.text) {
      item.delete();
    }
  }
  text(slide, "个人介绍", { left: 132, top: 49, width: 634, height: 28 }, {
    size: 24,
    bold: true,
    color: C.white,
    align: "center",
  });
}

async function refinePersonalTimeline(slide) {
  const qwenLogo = path.join(ROOT, "assets", "qwen", "qwen-logo.png");
  const rucLogo = path.join(ROOT, "assets", "brand", "ruc-seal.png");
  const tencentAdsLogo = path.join(ROOT, "assets", "brand", "tencent-ads-logo.png");

  removeTimelineHeaderSubtitle(slide);
  deleteBodyObjects(slide);

  text(slide, "李思奥（龙舌兰）", { left: 110, top: 164, width: 1120, height: 48 }, {
    size: 36,
    bold: true,
    color: C.qwen,
    align: "center",
  });
  shape(slide, "rect", { left: 595, top: 223, width: 150, height: 4 }, { fill: C.qwen });

  const lineX = 420;
  const dotSize = 30;
  const firstY = 264;
  const rowGap = 92;
  shape(slide, "rect", { left: lineX, top: 236, width: 2, height: 370 }, { fill: C.line });

  const events = [
    {
      logo: rucLogo,
      logoBox: { left: 252, width: 68, height: 68 },
      date: "2018.09–2024.06",
      org: "中国人民大学统计学院",
      work: "本硕",
    },
    {
      logo: tencentAdsLogo,
      logoBox: { left: 212, width: 166, height: 32 },
      logoCenterY: firstY + rowGap * 1.5 + 20,
      date: "2024.07–2025.03",
      org: "腾讯广告 —— 流量支持中心",
      work: "广告业务问题全链路策略优化",
    },
    {
      logo: null,
      logoBox: { left: 212, width: 166, height: 32 },
      date: "2025.04–2026.03",
      org: "腾讯广告 —— AI 推荐中心",
      work: "生成式推荐与大模型广告落地",
    },
    {
      logo: qwenLogo,
      logoBox: { left: 254, width: 64, height: 64 },
      date: "2026.04–至今",
      org: "阿里千问 —— 学习创新",
      work: "教育 OneRec 探索",
      active: true,
    },
  ];

  events.forEach((event, index) => {
    const y = firstY + index * rowGap;
    const dotCenterY = y + 20;
    event.logoPosition = {
      left: event.logoBox.left,
      top: (event.logoCenterY ?? dotCenterY) - event.logoBox.height / 2,
      width: event.logoBox.width,
      height: event.logoBox.height,
    };
    shape(slide, "ellipse", { left: lineX - dotSize / 2 + 1, top: dotCenterY - dotSize / 2, width: dotSize, height: dotSize }, {
      fill: event.active ? C.qwen : C.white,
      line: { style: "solid", fill: event.active ? C.qwen : C.blue, width: 3 },
    });
    text(slide, event.date, { left: 490, top: y - 1, width: 205, height: 34 }, {
      size: 22,
      color: C.ink,
    });
    text(slide, event.org, { left: 720, top: y - 9, width: 510, height: 26 }, {
      size: 20,
      color: C.ink,
    });
    text(slide, event.work, { left: 720, top: y + 20, width: 510, height: 25 }, {
      size: 17,
      color: C.ink,
    });
  });

  for (const event of events) {
    if (event.logo) {
      await image(slide, event.logo, event.logoPosition, "timeline logo");
    }
  }
}

refineTitleSlide(deck.slides.items[0]);
refineAgenda(deck.slides.items[1]);
await refinePersonalTimeline(deck.slides.items[2]);

await saveSectionDeck("01", deck);
