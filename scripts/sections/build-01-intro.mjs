import { buildSectionDeck, saveSectionDeck } from "../lib/qwen-deck.mjs";

const deck = await buildSectionDeck("01");

// Section-specific edits for 01 个人介绍 go here.
// This section owns: title page, agenda page, personal timeline page.

await saveSectionDeck("01", deck);
