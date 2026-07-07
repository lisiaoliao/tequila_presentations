import { buildSectionDeck, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("03");

// Section-specific edits for 03 工作产出与案例 go here.
// This section owns: divider 03, capability summary, demo overview, six case slides.

await saveSectionDeck("03", deck);
